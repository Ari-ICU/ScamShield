import { Response } from "express";
import { z } from "zod";
import prisma from "../prisma/prismaClient.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { calculateRiskScore } from "../services/riskEngine.js";
import { analyzeNumber } from "./number.controller.js";
import { broadcastNewReport, broadcastRiskAlert } from "../socket/socket.js";
import logger from "../utils/logger.js";
import { ScamType, ReportStatus } from "@prisma/client";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const createReportSchema = z.object({
  number: z.string()
    .min(3, "Phone number must be at least 3 characters")
    .max(30, "Phone number cannot exceed 30 characters"),
  category: z.nativeEnum(ScamType, {
    errorMap: () => ({ message: `Invalid category. Allowed values: ${Object.values(ScamType).join(", ")}` }),
  }),
  description: z.string().max(2000, "Description cannot exceed 2000 characters").optional().nullable(),
  province: z.string().max(100, "Province cannot exceed 100 characters").optional().nullable(),
  district: z.string().max(100, "District cannot exceed 100 characters").optional().nullable(),
  commune: z.string().max(100, "Commune cannot exceed 100 characters").optional().nullable(),
  village: z.string().max(100, "Village cannot exceed 100 characters").optional().nullable(),
});

export async function createReport(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const result = createReportSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors[0].message });
  }

  const { number, category, description, province, district, commune, village } = result.data;

  // Use libphonenumber-js for strict phone verification and normalization
  const phoneNumberObj = parsePhoneNumberFromString(number, "KH");
  if (!phoneNumberObj || !phoneNumberObj.isValid()) {
    return res.status(400).json({ error: "Invalid phone number standard format (Cambodian prefix or country code needed)" });
  }
  const cleanNumber = phoneNumberObj.number; // E.164 formatted number (e.g., +85512345678)

  try {
    // 1. Get or create the PhoneNumber entry
    let phoneNumber = await prisma.phoneNumber.findUnique({
      where: { number: cleanNumber },
    });

    if (!phoneNumber) {
      const analysis = analyzeNumber(cleanNumber);
      phoneNumber = await prisma.phoneNumber.create({
        data: {
          number: cleanNumber,
          countryCode: phoneNumberObj.country || analysis.code,
          riskScore: 0,
          totalReport: 0,
        },
      });
    }

    // Ensure the reporting user has a ReporterProfile initialized
    const existingProfile = await prisma.reporterProfile.findUnique({
      where: { userId },
    });
    if (!existingProfile) {
      await prisma.reporterProfile.create({
        data: {
          userId,
          reputationScore: 0,
          approvedReports: 0,
          rejectedReports: 0,
          verificationLevel: req.user?.role === "ADMIN" ? "MODERATOR" : "NEW_USER",
        },
      });
    }

    // 2. Create the Report link
    const { classifyScamText } = await import("../services/aiClassifier.js");
    const aiResult = classifyScamText(description || null);

    const report = await prisma.report.create({
      data: {
        description,
        category: category as ScamType,
        userId,
        numberId: phoneNumber.id,
        province,
        district,
        commune,
        village,
        status: ReportStatus.PENDING,
        aiCategory: aiResult.category,
        aiConfidence: aiResult.confidence,
      },
    });

    // Handle evidence uploads
    const files = req.files as Express.Multer.File[] | undefined;
    const evidenceList: any[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const evidence = await prisma.evidence.create({
          data: {
            fileUrl: `/uploads/${file.filename}`,
            fileType: file.mimetype,
            reportId: report.id,
          },
        });
        evidenceList.push(evidence);
      }
    }

    // 3. Recalculate Risk Score (Using the new detailed engine and updating DB/Cache)
    const { recalculatePhoneNumberRisk } = await import("../jobs/worker.js");
    const { sendInAppNotification } = await import("../socket/socket.js");
    const newRiskScore = await recalculatePhoneNumberRisk(phoneNumber.id);

    const updatedPhoneNumber = await prisma.phoneNumber.findUnique({
      where: { id: phoneNumber.id },
    }) || phoneNumber;
    const totalReportsCount = updatedPhoneNumber.totalReport;

    // 4. Notify watchers
    const watchers = await prisma.watchlist.findMany({
      where: { numberId: phoneNumber.id },
    });

    for (const watcher of watchers) {
      if (watcher.userId === userId) continue;
      const notification = await prisma.notification.create({
        data: {
          userId: watcher.userId,
          title: "Watchlist Alert: Risk Score Increased",
          message: `The phone number ${cleanNumber} you are watching has received a new report. Risk score is now ${newRiskScore}%.`,
          type: "WATCHLIST_UPDATE",
        },
      });
      sendInAppNotification(watcher.userId, notification);
    }

    logger.info(`Report filed for ${cleanNumber} by User ID ${userId}. Status: ${report.status}. New Risk Score: ${newRiskScore}`);

    // Mask user details for socket payload
    const maskedEmail = req.user?.email
      ? req.user.email.replace(/(.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + "*".repeat(b.length))
      : "Anonymous";

    const socketPayload = {
      id: report.id,
      number: cleanNumber,
      category: report.category,
      description: report.description,
      createdAt: report.createdAt,
      reporter: maskedEmail,
      riskScore: newRiskScore,
      province: report.province,
      district: report.district,
      commune: report.commune,
      village: report.village,
      status: report.status,
      evidence: evidenceList,
    };

    // 5. Broadcast to Socket.IO
    broadcastNewReport(socketPayload);
    if (newRiskScore >= 75) {
      broadcastRiskAlert({
        number: cleanNumber,
        riskScore: newRiskScore,
        totalReports: totalReportsCount,
        category: report.category,
      });
    }

    return res.status(201).json({
      message: "Report submitted successfully",
      report: { ...report, evidence: evidenceList },
      phoneNumber: updatedPhoneNumber,
    });
  } catch (err: any) {
    logger.error(`Error creating report: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getRecentReports(req: AuthenticatedRequest, res: Response) {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        phoneNumber: {
          select: {
            number: true,
            riskScore: true,
            countryCode: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
        evidence: true,
      },
    });

    // Format reports, masking emails
    const formatted = reports.map((r: any) => {
      const email = r.user.email;
      const maskedEmail = email.replace(/(.{2})(.*)(?=@)/, (_: string, a: string, b: string) => a + "*".repeat(b.length));
      return {
        id: r.id,
        number: r.phoneNumber.number,
        riskScore: r.phoneNumber.riskScore,
        countryCode: r.phoneNumber.countryCode,
        category: r.category,
        description: r.description,
        createdAt: r.createdAt,
        reporter: maskedEmail,
        province: r.province,
        district: r.district,
        commune: r.commune,
        village: r.village,
        status: r.status,
        evidence: r.evidence,
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    logger.error(`Error fetching recent reports: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

