import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../prisma/prismaClient.js";
import { logAdminAction } from "../utils/auditLogger.js";
import logger from "../utils/logger.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { calculateRiskScore } from "../services/riskEngine.js";

const submitAppealSchema = z.object({
  number: z.string().min(3, "Phone number is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(2000, "Reason cannot exceed 2000 characters"),
  contactEmail: z.string().email("Invalid contact email address"),
});

export async function submitAppeal(req: Request, res: Response) {
  try {
    const result = submitAppealSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0].message });
    }

    const { number, reason, contactEmail } = result.data;
    const cleanNumber = number.trim().replace(/\s+/g, "");

    // Find if the number exists
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { number: cleanNumber },
    });

    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found in registry" });
    }

    // Handle uploaded proof file (if any)
    let proofUrl: string | undefined = undefined;
    if (req.file) {
      proofUrl = `/uploads/${req.file.filename}`;
    }

    // Create the Appeal
    const appeal = await prisma.appeal.create({
      data: {
        numberId: phoneNumber.id,
        reason,
        contactEmail,
        proofUrl,
      },
    });

    logger.info(`Appeal submitted for number: ${cleanNumber} by ${contactEmail}`);

    return res.status(201).json({
      message: "Appeal submitted successfully",
      appeal,
    });
  } catch (err: any) {
    logger.error(`Error submitting appeal: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAppeals(req: AuthenticatedRequest, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(100, parseInt((req.query.limit as string) || "50"));
  const skip = (page - 1) * limit;

  try {
    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          phoneNumber: {
            select: {
              number: true,
              riskScore: true,
              totalReport: true,
            },
          },
        },
      }),
      prisma.appeal.count(),
    ]);

    return res.json({
      data: appeals,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    logger.error(`Error fetching appeals: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function resolveAppeal(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (status !== "APPROVED" && status !== "REJECTED") {
    return res.status(400).json({ error: "Invalid status. Must be APPROVED or REJECTED" });
  }

  try {
    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: { phoneNumber: true },
    });

    if (!appeal) {
      return res.status(404).json({ error: "Appeal not found" });
    }

    if (appeal.status !== "PENDING") {
      return res.status(400).json({ error: "Appeal has already been resolved" });
    }

    const resolvedAppeal = await prisma.appeal.update({
      where: { id },
      data: {
        status,
        resolvedAt: new Date(),
      },
    });

    if (status === "APPROVED") {
      // Reject all reports for this number
      await prisma.report.updateMany({
        where: { numberId: appeal.numberId },
        data: { status: "FALSE_REPORT" },
      });

      // Reset riskScore and totalReport to 0 since all reports are now rejected
      await prisma.phoneNumber.update({
        where: { id: appeal.numberId },
        data: {
          riskScore: 0,
          totalReport: 0,
        },
      });

      logger.info(`Appeal approved for number ${appeal.phoneNumber.number}. All reports set to REJECTED.`);
    }

    // Invalidate search cache
    const { delCache } = await import("../utils/redis.js");
    await delCache(`cache:number:${appeal.phoneNumber.number}`);

    // Check if the appeal email is associated with a registered User and notify them
    const registeredUser = await prisma.user.findUnique({
      where: { email: appeal.contactEmail },
    });
    if (registeredUser) {
      const { sendInAppNotification } = await import("../socket/socket.js");
      const notification = await prisma.notification.create({
        data: {
          userId: registeredUser.id,
          title: "Appeal Decision Received",
          message: `Your appeal for phone number ${appeal.phoneNumber.number} has been ${status === "APPROVED" ? "approved" : "rejected"} by a moderator.`,
          type: "APPEAL",
        },
      });
      sendInAppNotification(registeredUser.id, notification);
    }

    // Log the audit action
    await logAdminAction(
      adminId,
      `RESOLVE_APPEAL_${status}`,
      "Appeal",
      id,
      {
        phoneNumber: appeal.phoneNumber.number,
        reason: appeal.reason,
      }
    );

    return res.json({
      message: `Appeal resolved successfully as ${status}`,
      appeal: resolvedAppeal,
    });
  } catch (err: any) {
    logger.error(`Error resolving appeal: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}
