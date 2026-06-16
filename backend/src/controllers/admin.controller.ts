import { Request, Response } from "express";


import prisma from "../prisma/prismaClient.js";
import { calculateRiskScore } from "../services/riskEngine.js";
import logger from "../utils/logger.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { ReportStatus, Role } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

// Helper function to recalculate risk scores using detailed risk engine
async function recalculateRiskAndTotal(numberId: string) {
  const { recalculatePhoneNumberRisk } = await import("../jobs/worker.js");
  await recalculatePhoneNumberRisk(numberId);
}

export async function getStats(req: Request, res: Response) {
  try {
    // Try to load cached stats
    const { getCache } = await import("../utils/redis.js");
    const cached = await getCache("cache:dashboard:stats");
    if (cached) {
      logger.info("⚡ Cache hit for dashboard statistics");
      return res.json(JSON.parse(cached));
    }

    const totalScamNumbers = await prisma.phoneNumber.count({
      where: { riskScore: { gte: 30 } },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reportsToday = await prisma.report.count({
      where: { createdAt: { gte: today } },
    });

    // Category distribution
    const categoryGroup = await prisma.report.groupBy({
      by: ["category"],
      _count: {
        id: true,
      },
    });

    const categoryDistribution = categoryGroup.map((g) => ({
      category: g.category,
      count: g._count.id,
    }));

    // Country distribution
    const countryGroup = await prisma.phoneNumber.groupBy({
      by: ["countryCode"],
      _count: {
        id: true,
      },
    });

    const countryDistribution = countryGroup.map((g) => ({
      countryCode: g.countryCode || "UNKNOWN",
      count: g._count.id,
    }));

    // Province/geographic distribution
    const provinceGroup = await prisma.report.groupBy({
      by: ["province"],
      where: {
        province: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
    });

    const provinceDistribution = provinceGroup
      .filter((g) => g.province && g.province.trim() !== "")
      .map((g) => ({
        province: g.province as string,
        count: g._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    // Highest risk numbers
    const highestRiskNumbers = await prisma.phoneNumber.findMany({
      orderBy: { riskScore: "desc" },
      take: 5,
      select: {
        id: true,
        number: true,
        riskScore: true,
        totalReport: true,
      },
    });

    return res.json({
      totalScamNumbers,
      reportsToday,
      categoryDistribution,
      countryDistribution,
      provinceDistribution,
      highestRiskNumbers,
    });
  } catch (err: any) {
    logger.error(`Error loading dashboard statistics: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getReports(req: Request, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(100, parseInt((req.query.limit as string) || "50"));
  const skip = (page - 1) * limit;

  try {
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          phoneNumber: { select: { number: true, riskScore: true } },
          user: { select: { email: true } },
          evidence: true,
        },
      }),
      prisma.report.count(),
    ]);
    return res.json({ data: reports, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    logger.error(`Error loading admin reports: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateReport(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { description, category, status } = req.body;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: { phoneNumber: true }
    });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        description: description !== undefined ? description : report.description,
        category: category || report.category,
        status: status || report.status,
      },
    });

    // If status changed or report was updated, recalculate the risk score
    if (status && status !== report.status) {
      await recalculateRiskAndTotal(report.numberId);

      // Adjust reporter reputation score
      const reporterId = report.userId;
      let pointsDiff = 0;
      if (report.status === "PENDING" && status === "APPROVED") pointsDiff = 10;
      else if (report.status === "PENDING" && status === "REJECTED") pointsDiff = -5;
      else if (report.status === "APPROVED" && status === "REJECTED") pointsDiff = -15;
      else if (report.status === "REJECTED" && status === "APPROVED") pointsDiff = 15;
      else if (report.status === "APPROVED" && (status === "PENDING" || status === "UNDER_REVIEW")) pointsDiff = -10;
      else if (report.status === "REJECTED" && (status === "PENDING" || status === "UNDER_REVIEW")) pointsDiff = 5;
      else if ((report.status === "PENDING" || report.status === "UNDER_REVIEW") && status === "APPROVED") pointsDiff = 10;
      else if ((report.status === "PENDING" || report.status === "UNDER_REVIEW") && status === "REJECTED") pointsDiff = -5;

      if (pointsDiff !== 0) {
        const user = await prisma.user.findUnique({ where: { id: reporterId } });
        if (user) {
          const newScore = Math.max(0, user.reporterScore + pointsDiff);
          await prisma.user.update({
            where: { id: reporterId },
            data: { reporterScore: newScore },
          });
        }
      }

      // Create in-app notification for reporter
      const { sendInAppNotification } = await import("../socket/socket.js");
      const statusLabels: Record<string, string> = {
        APPROVED: "Approved",
        REJECTED: "Rejected",
        UNDER_REVIEW: "placed Under Review",
        PENDING: "set back to Pending"
      };
      const label = statusLabels[status] || status;

      const notification = await prisma.notification.create({
        data: {
          userId: reporterId,
          title: "Report Status Updated",
          message: `Your report for number ${report.phoneNumber?.number || "scam line"} has been ${label} by a moderator.`,
          type: "MODERATION",
        },
      });
      sendInAppNotification(reporterId, notification);
    }

    // Log admin action
    await logAdminAction(adminId, "UPDATE_REPORT", "Report", id, {
      previous: { description: report.description, category: report.category, status: report.status },
      updated: { description: updated.description, category: updated.category, status: updated.status },
    });

    logger.info(`Admin updated report ID: ${id}`);
    return res.json(updated);
  } catch (err: any) {
    logger.error(`Error updating report: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteReport(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: { phoneNumber: true },
    });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    await prisma.report.delete({ where: { id } });

    // Recalculate risk score for the corresponding PhoneNumber
    await recalculateRiskAndTotal(report.numberId);

    // Log admin action
    await logAdminAction(adminId, "DELETE_REPORT", "Report", id, {
      number: report.phoneNumber.number,
      description: report.description,
      category: report.category,
    });

    logger.info(`Admin deleted report ID: ${id}`);
    return res.json({ message: "Report deleted successfully" });
  } catch (err: any) {
    logger.error(`Error deleting report: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUsers(req: Request, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(100, parseInt((req.query.limit as string) || "50"));
  const skip = (page - 1) * limit;

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, email: true, role: true, createdAt: true,
          _count: { select: { reports: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);
    return res.json({ data: users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    logger.error(`Error loading admin users list: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateUserRole(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { role } = req.body;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (role !== "USER" && role !== "ADMIN") {
    return res.status(400).json({ error: "Invalid role value. Must be USER or ADMIN." });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (adminId === id && role === "USER") {
      return res.status(400).json({ error: "Admins cannot demote themselves to USER." });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { reports: true }
        }
      }
    });

    // Log admin action
    await logAdminAction(adminId, "UPDATE_USER_ROLE", "User", id, {
      userEmail: targetUser.email,
      fromRole: targetUser.role,
      toRole: role,
    });

    logger.info(`Admin updated user ID: ${id} role to ${role}`);
    return res.json(updated);
  } catch (err: any) {
    logger.error(`Error updating user role: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (adminId === id) {
      return res.status(400).json({ error: "Admins cannot delete their own account." });
    }

    // Get all numbers reported by this user to recalculate their risk scores
    const userReports = await prisma.report.findMany({
      where: { userId: id },
      select: { numberId: true },
    });
    const uniqueNumberIds = Array.from(new Set(userReports.map((r) => r.numberId)));

    await prisma.user.delete({ where: { id } });

    // Recalculate risk scores for affected numbers
    for (const numberId of uniqueNumberIds) {
      await recalculateRiskAndTotal(numberId);
    }

    // Log admin action
    await logAdminAction(adminId, "DELETE_USER", "User", id, {
      userEmail: targetUser.email,
    });

    logger.info(`Admin deleted user ID: ${id}`);
    return res.json({ message: "User account and their reports deleted successfully" });
  } catch (err: any) {
    logger.error(`Error deleting user: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getNumbers(req: Request, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(100, parseInt((req.query.limit as string) || "50"));
  const skip = (page - 1) * limit;

  try {
    const [numbers, total] = await Promise.all([
      prisma.phoneNumber.findMany({
        orderBy: { riskScore: "desc" },
        skip,
        take: limit,
      }),
      prisma.phoneNumber.count(),
    ]);
    return res.json({ data: numbers, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    logger.error(`Error loading admin phone numbers: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteNumber(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const phoneNumber = await prisma.phoneNumber.findUnique({ where: { id } });
    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found" });
    }

    await prisma.phoneNumber.delete({ where: { id } });

    // Log admin action
    await logAdminAction(adminId, "DELETE_PHONE_NUMBER", "PhoneNumber", id, {
      number: phoneNumber.number,
    });

    logger.info(`Admin deleted phone number ID: ${id} (${phoneNumber.number})`);
    return res.json({ message: "Phone number and all associated reports deleted successfully" });
  } catch (err: any) {
    logger.error(`Error deleting phone number: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createNumber(req: AuthenticatedRequest, res: Response) {
  const { number, countryCode, riskScore } = req.body;
  const adminId = req.user?.id;

  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!number) {
    return res.status(400).json({ error: "Phone number is required." });
  }

  // Parse and normalize manually added phone number
  const phoneNumberObj = parsePhoneNumberFromString(number, "KH");
  if (!phoneNumberObj || !phoneNumberObj.isValid()) {
    return res.status(400).json({ error: "Invalid phone number format." });
  }
  const cleanNumber = phoneNumberObj.number;

  try {
    // Check if number already exists
    const existing = await prisma.phoneNumber.findUnique({ where: { number: cleanNumber } });
    if (existing) {
      return res.status(400).json({ error: "Phone number already exists in registry." });
    }

    const parsedRisk = Math.min(100, Math.max(0, parseInt(riskScore) || 50));
    const newNumber = await prisma.phoneNumber.create({
      data: {
        number: cleanNumber,
        countryCode: countryCode || phoneNumberObj.country || null,
        riskScore: parsedRisk,
        totalReport: 0,
      },
    });

    // Log admin action
    await logAdminAction(adminId, "CREATE_PHONE_NUMBER", "PhoneNumber", newNumber.id, {
      number: cleanNumber,
      riskScore: parsedRisk,
    });

    logger.info(`Admin manually flagged phone number: ${cleanNumber} (Risk: ${parsedRisk}%)`);
    return res.json(newNumber);
  } catch (err: any) {
    logger.error(`Error creating phone number manually: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function exportNumbers(req: Request, res: Response) {
  try {
    const numbers = await prisma.phoneNumber.findMany({
      orderBy: { riskScore: "desc" },
    });
    return res.json(numbers);
  } catch (err: any) {
    logger.error(`Error exporting phone numbers: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1"));
  const limit = Math.min(100, parseInt((req.query.limit as string) || "50"));
  const skip = (page - 1) * limit;

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count(),
    ]);

    // Premium touch: fetch users/admins list to map admin IDs to emails
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true, email: true },
    });

    const emailMap = new Map(admins.map((a) => [a.id, a.email]));

    const formattedLogs = logs.map((log) => ({
      ...log,
      adminEmail: emailMap.get(log.adminId) || "Unknown Admin",
    }));

    return res.json({
      data: formattedLogs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    logger.error(`Error fetching audit logs: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}


