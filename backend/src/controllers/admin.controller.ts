import { Request, Response } from "express";
import prisma from "../prisma/prismaClient.js";
import { calculateRiskScore } from "../services/riskEngine.js";
import logger from "../utils/logger.js";

export async function getStats(req: Request, res: Response) {
  try {
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

export async function updateReport(req: Request, res: Response) {
  const { id } = req.params;
  const { description, category } = req.body;

  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        description: description !== undefined ? description : report.description,
        category: category || report.category,
      },
    });

    logger.info(`Admin updated report ID: ${id}`);
    return res.json(updated);
  } catch (err: any) {
    logger.error(`Error updating report: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteReport(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    await prisma.report.delete({ where: { id } });

    // Recalculate risk score for the corresponding PhoneNumber
    const numberId = report.numberId;
    const phoneNumber = await prisma.phoneNumber.findUnique({ where: { id: numberId } });

    if (phoneNumber) {
      const totalReportsCount = await prisma.report.count({ where: { numberId } });

      const uniqueUsersAgg = await prisma.report.groupBy({
        by: ["userId"],
        where: { numberId },
      });
      const uniqueUsersCount = uniqueUsersAgg.length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentReportsCount = await prisma.report.count({
        where: { numberId, createdAt: { gte: thirtyDaysAgo } },
      });

      const newRiskScore = calculateRiskScore({
        totalReports: totalReportsCount,
        countryCode: phoneNumber.countryCode || undefined,
        uniqueUsers: uniqueUsersCount,
        recentReports: recentReportsCount,
      });

      await prisma.phoneNumber.update({
        where: { id: numberId },
        data: {
          riskScore: newRiskScore,
          totalReport: totalReportsCount,
        },
      });
    }

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

export async function updateUserRole(req: Request, res: Response) {
  const { id } = req.params;
  const { role } = req.body;

  if (role !== "USER" && role !== "ADMIN") {
    return res.status(400).json({ error: "Invalid role value. Must be USER or ADMIN." });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if ((req as any).user?.id === id && role === "USER") {
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

    logger.info(`Admin updated user ID: ${id} role to ${role}`);
    return res.json(updated);
  } catch (err: any) {
    logger.error(`Error updating user role: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if ((req as any).user?.id === id) {
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
      const phoneNumber = await prisma.phoneNumber.findUnique({ where: { id: numberId } });
      if (phoneNumber) {
        const totalReportsCount = await prisma.report.count({ where: { numberId } });

        const uniqueUsersAgg = await prisma.report.groupBy({
          by: ["userId"],
          where: { numberId },
        });
        const uniqueUsersCount = uniqueUsersAgg.length;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentReportsCount = await prisma.report.count({
          where: { numberId, createdAt: { gte: thirtyDaysAgo } },
        });

        const newRiskScore = calculateRiskScore({
          totalReports: totalReportsCount,
          countryCode: phoneNumber.countryCode || undefined,
          uniqueUsers: uniqueUsersCount,
          recentReports: recentReportsCount,
        });

        await prisma.phoneNumber.update({
          where: { id: numberId },
          data: {
            riskScore: newRiskScore,
            totalReport: totalReportsCount,
          },
        });
      }
    }

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

export async function deleteNumber(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const phoneNumber = await prisma.phoneNumber.findUnique({ where: { id } });
    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found" });
    }

    await prisma.phoneNumber.delete({ where: { id } });

    logger.info(`Admin deleted phone number ID: ${id} (${phoneNumber.number})`);
    return res.json({ message: "Phone number and all associated reports deleted successfully" });
  } catch (err: any) {
    logger.error(`Error deleting phone number: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createNumber(req: Request, res: Response) {
  const { number, countryCode, riskScore } = req.body;
  if (!number) {
    return res.status(400).json({ error: "Phone number is required." });
  }

  try {
    // Check if number already exists
    const existing = await prisma.phoneNumber.findUnique({ where: { number } });
    if (existing) {
      return res.status(400).json({ error: "Phone number already exists in registry." });
    }

    const parsedRisk = Math.min(100, Math.max(0, parseInt(riskScore) || 50));
    const newNumber = await prisma.phoneNumber.create({
      data: {
        number,
        countryCode: countryCode || null,
        riskScore: parsedRisk,
        totalReport: 0,
      },
    });

    logger.info(`Admin manually flagged phone number: ${number} (Risk: ${parsedRisk}%)`);
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

