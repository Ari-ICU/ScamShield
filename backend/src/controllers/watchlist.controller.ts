import { Response } from "express";
import prisma from "../prisma/prismaClient.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { analyzeNumber } from "./number.controller.js";
import logger from "../utils/logger.js";

/**
 * Retrieves the user's watchlist, including phone number risk score and last report activity.
 */
export async function getWatchlist(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const list = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        phoneNumber: {
          include: {
            reports: {
              where: { status: { not: "REJECTED" } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = list.map((item) => {
      const p = item.phoneNumber;
      const lastReport = p.reports[0] || null;
      return {
        id: item.id,
        numberId: p.id,
        number: p.number,
        riskScore: p.riskScore,
        totalReport: p.totalReport,
        createdAt: item.createdAt,
        lastReportDate: lastReport ? lastReport.createdAt : null,
        lastReportCategory: lastReport ? lastReport.category : null,
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    logger.error(`Error fetching watchlist for User ${userId}: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Adds a phone number to the user's watchlist.
 */
export async function addToWatchlist(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { number } = req.body;
  if (!number) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const phoneNumberObj = parsePhoneNumberFromString(number, "KH");
  if (!phoneNumberObj || !phoneNumberObj.isValid()) {
    return res.status(400).json({ error: "Invalid phone number format." });
  }
  const cleanNumber = phoneNumberObj.number;

  try {
    // 1. Get or create Phone Number
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

    // 2. Check if already watching
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_numberId: {
          userId,
          numberId: phoneNumber.id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "Number is already in your watchlist." });
    }

    // 3. Create watchlist item
    const item = await prisma.watchlist.create({
      data: {
        userId,
        numberId: phoneNumber.id,
      },
      include: {
        phoneNumber: true,
      },
    });

    logger.info(`User ${userId} watched phone number ${cleanNumber}`);

    return res.status(201).json({
      message: "Phone number added to watchlist successfully.",
      data: {
        id: item.id,
        numberId: phoneNumber.id,
        number: phoneNumber.number,
        riskScore: phoneNumber.riskScore,
        totalReport: phoneNumber.totalReport,
        createdAt: item.createdAt,
      },
    });
  } catch (err: any) {
    logger.error(`Error adding to watchlist: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Removes a phone number from the user's watchlist.
 */
export async function removeFromWatchlist(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { numberId } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!numberId) {
    return res.status(400).json({ error: "Phone number registry ID is required" });
  }

  try {
    const item = await prisma.watchlist.findUnique({
      where: {
        userId_numberId: {
          userId,
          numberId,
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Watchlist entry not found" });
    }

    await prisma.watchlist.delete({
      where: {
        userId_numberId: {
          userId,
          numberId,
        },
      },
    });

    logger.info(`User ${userId} unwatched phone number ID ${numberId}`);
    return res.json({ message: "Phone number removed from watchlist successfully." });
  } catch (err: any) {
    logger.error(`Error removing from watchlist: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}
