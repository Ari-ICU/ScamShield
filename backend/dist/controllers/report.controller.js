import { z } from "zod";
import prisma from "../prisma/prismaClient.js";
import { calculateRiskScore } from "../services/riskEngine.js";
import { analyzeNumber } from "./number.controller.js";
import { broadcastNewReport, broadcastRiskAlert } from "../socket/socket.js";
import logger from "../utils/logger.js";
import { ScamType } from "@prisma/client";
const createReportSchema = z.object({
    number: z.string()
        .min(3, "Phone number must be at least 3 characters")
        .max(30, "Phone number cannot exceed 30 characters")
        .regex(/^[+0-9\s\-()]+$/, "Phone number contains invalid characters"),
    category: z.nativeEnum(ScamType, {
        errorMap: () => ({ message: `Invalid category. Allowed values: ${Object.values(ScamType).join(", ")}` }),
    }),
    description: z.string().max(2000, "Description cannot exceed 2000 characters").optional().nullable(),
    province: z.string().max(100, "Province cannot exceed 100 characters").optional().nullable(),
    district: z.string().max(100, "District cannot exceed 100 characters").optional().nullable(),
    commune: z.string().max(100, "Commune cannot exceed 100 characters").optional().nullable(),
    village: z.string().max(100, "Village cannot exceed 100 characters").optional().nullable(),
});
export async function createReport(req, res) {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const result = createReportSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
    }
    const { number, category, description, province, district, commune, village } = result.data;
    // Sanitize number
    const cleanNumber = number.trim().replace(/\s+/g, "");
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
                    countryCode: analysis.code,
                    riskScore: 0,
                    totalReport: 0,
                },
            });
        }
        // 2. Create the Report link
        const report = await prisma.report.create({
            data: {
                description,
                category: category,
                userId,
                numberId: phoneNumber.id,
                province,
                district,
                commune,
                village,
            },
        });
        // 3. Recalculate Risk Score
        const totalReportsCount = await prisma.report.count({
            where: { numberId: phoneNumber.id },
        });
        // Count unique users who reported
        const uniqueUsersAgg = await prisma.report.groupBy({
            by: ["userId"],
            where: { numberId: phoneNumber.id },
        });
        const uniqueUsersCount = uniqueUsersAgg.length;
        // Count recent reports (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentReportsCount = await prisma.report.count({
            where: {
                numberId: phoneNumber.id,
                createdAt: { gte: thirtyDaysAgo },
            },
        });
        const newRiskScore = calculateRiskScore({
            totalReports: totalReportsCount,
            countryCode: phoneNumber.countryCode || undefined,
            uniqueUsers: uniqueUsersCount,
            recentReports: recentReportsCount,
        });
        // 4. Update the PhoneNumber record
        const updatedPhoneNumber = await prisma.phoneNumber.update({
            where: { id: phoneNumber.id },
            data: {
                riskScore: newRiskScore,
                totalReport: totalReportsCount,
            },
        });
        logger.info(`Report filed for ${cleanNumber} by User ID ${userId}. New Risk Score: ${newRiskScore}`);
        // Mask user details for socket payload
        const maskedEmail = req.user?.email
            ? req.user.email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + "*".repeat(b.length))
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
            report,
            phoneNumber: updatedPhoneNumber,
        });
    }
    catch (err) {
        logger.error(`Error creating report: ${err.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
}
export async function getRecentReports(req, res) {
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
            },
        });
        // Format reports, masking emails
        const formatted = reports.map((r) => {
            const email = r.user.email;
            const maskedEmail = email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + "*".repeat(b.length));
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
            };
        });
        return res.json(formatted);
    }
    catch (err) {
        logger.error(`Error fetching recent reports: ${err.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
}
