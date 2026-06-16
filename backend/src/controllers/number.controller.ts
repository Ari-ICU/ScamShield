import { Request, Response } from "express";
import prisma from "../prisma/prismaClient.js";
import logger from "../utils/logger.js";
import { broadcastIncomingCall, broadcastAnswerCall, broadcastHangupCall } from "../socket/socket.js";
import os from "os";
import crypto from "crypto";

// Deep number analysis helper (Country, Carrier, Location)
export interface NumberAnalysis {
  country: string;
  code: string;
  carrier: string;
  location: string;
}

export interface ActiveCallState {
  number: string;
  riskScore: number;
  carrier: string;
  country: string;
  location: string;
  province: string;
  district: string;
  commune: string;
  village: string;
  category: string;
  lat?: number;
  lng?: number;
  status: "RINGING" | "ACTIVE";
  startTime?: number; // timestamp when answered
  pairingToken?: string;
  locationSource?: string;
}

export let currentActiveCall: ActiveCallState | null = null;


export function analyzeNumber(num: string): NumberAnalysis {
  const clean = num.replace(/[^\d+]/g, "");

  // 1. Detect Country
  let country = "Unknown";
  let code = "UNKNOWN";

  if (clean.startsWith("+855") || clean.startsWith("855") || /^0\d{8,9}$/.test(clean)) {
    country = "Cambodia";
    code = "KH";
  } else if (clean.startsWith("+1") || clean.startsWith("1")) {
    country = "United States/Canada";
    code = "US";
  } else if (clean.startsWith("+44") || clean.startsWith("44")) {
    country = "United Kingdom";
    code = "GB";
  } else if (clean.startsWith("+66") || clean.startsWith("66")) {
    country = "Thailand";
    code = "TH";
  } else if (clean.startsWith("+84") || clean.startsWith("84")) {
    country = "Vietnam";
    code = "VN";
  } else if (clean.startsWith("+65") || clean.startsWith("65")) {
    country = "Singapore";
    code = "SG";
  } else if (clean.startsWith("+60") || clean.startsWith("60")) {
    country = "Malaysia";
    code = "MY";
  } else if (clean.startsWith("+856") || clean.startsWith("856")) {
    country = "Laos";
    code = "LA";
  } else if (clean.startsWith("+")) {
    country = "International";
    code = "INT";
  }

  // 2. Perform deep analysis for Cambodia numbers
  let carrier = "N/A";
  let location = "N/A";

  if (code === "KH") {
    // Normalize to 0-started local format: e.g. +85512345678 -> 012345678, 85512345678 -> 012345678
    let local = clean;
    if (local.startsWith("+855")) {
      local = "0" + local.slice(4);
    } else if (local.startsWith("855")) {
      local = "0" + local.slice(3);
    }

    // Ensure it looks like 0XXXXXXXX (9 to 10 digits)
    if (/^0\d{8,9}$/.test(local)) {
      const prefix2 = local.slice(1, 3); // 2 digits: e.g. 12, 15, 23
      
      // Landline area codes mapping
      const landlines: { [key: string]: string } = {
        "23": "Phnom Penh",
        "24": "Kandal",
        "25": "Kampong Speu",
        "26": "Kampong Chhnang",
        "32": "Takeo",
        "33": "Kampot",
        "34": "Sihanoukville",
        "35": "Koh Kong",
        "36": "Kep",
        "42": "Kampong Cham",
        "43": "Prey Veng",
        "44": "Svay Rieng",
        "52": "Pursat",
        "53": "Battambang",
        "54": "Banteay Meanchey",
        "55": "Pailin",
        "62": "Kampong Thom",
        "63": "Siem Reap",
        "64": "Preah Vihear",
        "65": "Oddar Meanchey",
        "72": "Kratie",
        "73": "Mondulkiri",
        "74": "Stung Treng",
        "75": "Ratanakiri",
      };

      if (landlines[prefix2]) {
        carrier = "Telecom Cambodia (Landline)";
        location = landlines[prefix2];
      } else {
        // Mobile operators mapping
        const smartPrefixes = ["10", "15", "16", "69", "70", "81", "86", "87", "93", "96", "98"];
        const cellcardPrefixes = ["11", "12", "17", "61", "76", "77", "78", "79", "85", "89", "92", "99"];
        const metfonePrefixes = ["31", "60", "66", "67", "68", "71", "88", "90", "97"];
        const seatelPrefixes = ["18"];
        const cootelPrefixes = ["38"];

        location = "National Mobile";

        if (smartPrefixes.includes(prefix2)) {
          carrier = "Smart Axiata";
        } else if (cellcardPrefixes.includes(prefix2)) {
          carrier = "Cellcard (CamGSM)";
        } else if (metfonePrefixes.includes(prefix2)) {
          carrier = "Metfone (Viettel)";
        } else if (seatelPrefixes.includes(prefix2)) {
          carrier = "Seatel";
        } else if (cootelPrefixes.includes(prefix2)) {
          carrier = "Cootel";
        } else {
          carrier = "VoIP / Unknown Carrier";
        }
      }
    }
  } else if (code !== "UNKNOWN" && code !== "INT") {
    location = "International Call";
    carrier = "International Operator";
  } else if (code === "INT") {
    location = "International Gateway";
    carrier = "VoIP Routing";
  }

  return { country, code, carrier, location };
}

export async function searchNumber(req: Request, res: Response) {
  const { phone } = req.params;
  if (!phone) {
    return res.status(400).json({ error: "Phone number parameter is required" });
  }

  const cleanNumber = phone.trim().replace(/\s+/g, "");

  try {
    // 1. Try cache
    const { getCache, setCache } = await import("../utils/redis.js");
    const cacheKey = `cache:number:${cleanNumber}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.info(`⚡ Cache hit for search: ${cleanNumber}`);
      return res.json(JSON.parse(cached));
    }

    // 2. Query DB
    const dbNum = await prisma.phoneNumber.findUnique({
      where: { number: cleanNumber },
      include: {
        reports: {
          where: {
            status: { not: "REJECTED" }
          },
          orderBy: { createdAt: "desc" },
          include: {
            evidence: true,
            user: {
              select: {
                role: true,
                reporterScore: true
              }
            }
          }
        },
      },
    });

    const analysis = analyzeNumber(cleanNumber);

    if (!dbNum) {
      // Return safe schema for unregistered numbers without writing to DB yet
      const safePayload = {
        number: cleanNumber,
        country: analysis.country,
        countryCode: analysis.code,
        carrier: analysis.carrier,
        location: analysis.location,
        riskScore: 0,
        riskLevel: "SAFE",
        totalReports: 0,
        reports: [],
        recentReportsCount: 0,
        commonScamType: "NONE",
        evidenceCounts: { screenshots: 0, audio: 0, documents: 0 },
        lastReportedText: "Never",
        historyTimeline: [],
        createdAt: new Date(),
      };
      await setCache(cacheKey, JSON.stringify(safePayload), 300); // 5 min cache
      return res.json(safePayload);
    }

    // 3. Recalculate Detailed Risk Score dynamically
    const { calculateDetailedRiskScore } = await import("../services/riskEngine.js");
    
    const reportInputs = dbNum.reports.map((r) => ({
      createdAt: r.createdAt,
      status: r.status,
      evidenceCount: r.evidence.length,
      reporterRole: r.user.role,
      reporterScore: r.user.reporterScore,
      category: r.category,
    }));

    const dynamicRiskScore = calculateDetailedRiskScore({
      reports: reportInputs,
      countryCode: dbNum.countryCode || undefined,
    });

    // Update if it doesn't match dbNum.riskScore
    if (dynamicRiskScore !== dbNum.riskScore) {
      await prisma.phoneNumber.update({
        where: { id: dbNum.id },
        data: { riskScore: dynamicRiskScore },
      });
      dbNum.riskScore = dynamicRiskScore;
    }

    // Determine risk level label based on riskScore
    let riskLevel = "SAFE";
    if (dbNum.riskScore >= 75) {
      riskLevel = "HIGH_RISK";
    } else if (dbNum.riskScore >= 30) {
      riskLevel = "SUSPICIOUS";
    }

    // Count reports in last 7 days for velocity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReportsCount = await prisma.report.count({
      where: {
        numberId: dbNum.id,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // 4. Extract Common Scam Category
    const categoryCounts: Record<string, number> = {};
    dbNum.reports.forEach((r) => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    let commonScamType = "NONE";
    let maxCatCount = 0;
    for (const cat in categoryCounts) {
      if (categoryCounts[cat] > maxCatCount) {
        maxCatCount = categoryCounts[cat];
        commonScamType = cat;
      }
    }

    // 5. Extract Evidence File Counts
    let screenshots = 0;
    let audio = 0;
    let documents = 0;

    dbNum.reports.forEach((r) => {
      r.evidence.forEach((ev) => {
        const type = ev.fileType.toLowerCase();
        if (type.includes("image") || type.includes("png") || type.includes("jpeg")) {
          screenshots++;
        } else if (type.includes("audio") || type.includes("mp3") || type.includes("wav") || type.includes("ogg")) {
          audio++;
        } else {
          documents++;
        }
      });
    });

    // 6. Format Last Reported Time
    let lastReportedText = "Never";
    if (dbNum.reports.length > 0) {
      const lastReportDate = dbNum.reports[0].createdAt;
      const hoursDiff = Math.max(0, (Date.now() - new Date(lastReportDate).getTime()) / (1000 * 60 * 60));
      if (hoursDiff < 1) {
        lastReportedText = "Just now";
      } else if (hoursDiff < 24) {
        lastReportedText = `${Math.round(hoursDiff)} hours ago`;
      } else {
        lastReportedText = `${Math.round(hoursDiff / 24)} days ago`;
      }
    }

    // 7. Calculate Historical Risk Score Timeline (Past 6 Months)
    const historyTimeline: { month: string; riskScore: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      // Filter reports created before or on the end of this month
      const reportsBefore = dbNum.reports.filter((r) => new Date(r.createdAt) <= endOfMonth);

      const inputs = reportsBefore.map((r) => ({
        createdAt: r.createdAt,
        status: r.status,
        evidenceCount: r.evidence.length,
        reporterRole: r.user.role,
        reporterScore: r.user.reporterScore,
        category: r.category,
      }));

      const scoreAtMonth = calculateDetailedRiskScore({
        reports: inputs,
        countryCode: dbNum.countryCode || undefined,
      });

      historyTimeline.push({
        month: `${monthNames[endOfMonth.getMonth()]}`,
        riskScore: scoreAtMonth,
      });
    }

    const payload = {
      id: dbNum.id,
      number: dbNum.number,
      country: analysis.country,
      countryCode: dbNum.countryCode || analysis.code,
      carrier: analysis.carrier,
      location: analysis.location,
      riskScore: dbNum.riskScore,
      riskLevel,
      totalReports: dbNum.totalReport,
      reports: dbNum.reports.map((r) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        userId: r.userId,
        status: r.status,
        createdAt: r.createdAt,
        evidenceCount: r.evidence.length,
      })),
      recentReportsCount,
      commonScamType,
      evidenceCounts: { screenshots, audio, documents },
      lastReportedText,
      historyTimeline,
      createdAt: dbNum.createdAt,
    };

    // Cache the response
    await setCache(cacheKey, JSON.stringify(payload), 300); // 5 min cache

    logger.info(`Looked up number: ${cleanNumber} (Score: ${dbNum.riskScore}, Level: ${riskLevel})`);

    return res.json(payload);
  } catch (err: any) {
    logger.error(`Error searching number ${cleanNumber}: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function lookupNumber(req: Request, res: Response) {
  const { phone } = req.params;
  if (!phone) {
    return res.status(400).json({ error: "Phone number parameter is required" });
  }

  const cleanNumber = phone.trim().replace(/\s+/g, "");

  try {
    const { getCache, setCache } = await import("../utils/redis.js");
    const cacheKey = `cache:lookup:${cleanNumber}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.info(`⚡ Cache hit for Caller ID lookup: ${cleanNumber}`);
      return res.json(JSON.parse(cached));
    }

    const dbNum = await prisma.phoneNumber.findUnique({
      where: { number: cleanNumber },
      include: {
        reports: {
          where: { status: { not: "REJECTED" } },
          include: {
            user: { select: { role: true, reporterScore: true } },
            evidence: true,
          },
        },
      },
    });

    const analysis = analyzeNumber(cleanNumber);

    if (!dbNum || dbNum.reports.length === 0) {
      const safePayload = {
        number: cleanNumber,
        isScam: false,
        riskScore: 0,
        riskLevel: "SAFE",
        scamType: "NONE",
        totalReports: 0,
        warningMessage: "Verified secure connection. No active threats found.",
      };
      await setCache(cacheKey, JSON.stringify(safePayload), 600); // 10 minutes cache
      return res.json(safePayload);
    }

    // Calculate detailed risk score
    const { calculateDetailedRiskScore } = await import("../services/riskEngine.js");
    const reportInputs = dbNum.reports.map((r) => ({
      createdAt: r.createdAt,
      status: r.status,
      evidenceCount: r.evidence.length,
      reporterRole: r.user.role,
      reporterScore: r.user.reporterScore,
      category: r.category,
    }));

    const riskScore = calculateDetailedRiskScore({
      reports: reportInputs,
      countryCode: dbNum.countryCode || undefined,
    });

    let riskLevel = "SAFE";
    if (riskScore >= 75) {
      riskLevel = "HIGH_RISK";
    } else if (riskScore >= 30) {
      riskLevel = "SUSPICIOUS";
    }

    // Extract common scam type
    const categoryCounts: Record<string, number> = {};
    dbNum.reports.forEach((r) => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    let scamType = "OTHER";
    let maxCount = 0;
    for (const cat in categoryCounts) {
      if (categoryCounts[cat] > maxCount) {
        maxCount = categoryCounts[cat];
        scamType = cat;
      }
    }

    const payload = {
      number: cleanNumber,
      isScam: riskScore >= 30,
      riskScore,
      riskLevel,
      scamType,
      totalReports: dbNum.reports.length,
      warningMessage: riskScore >= 75
        ? `Warning! High risk caller! ScamShield has flagged this number for ${scamType.replace(/_/g, " ")}.`
        : riskScore >= 30
        ? `Caution: Suspicious caller. This number has been reported for ${scamType.replace(/_/g, " ")}.`
        : "Safe connection. Minimal threat detected.",
    };

    await setCache(cacheKey, JSON.stringify(payload), 600); // 10 min cache
    return res.json(payload);
  } catch (err: any) {
    logger.error(`Error in lookupNumber for ${cleanNumber}: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function detectCall(req: Request, res: Response) {
  const {
    number,
    province: reqProvince,
    district: reqDistrict,
    commune: reqCommune,
    village: reqVillage,
    carrier: reqCarrier,
    category: reqCategory,
    riskScore: reqRiskScore,
    lat: reqLat,
    lng: reqLng,
    locationSource: reqLocationSource
  } = req.body;

  if (!number) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  const cleanNumber = number.trim().replace(/\s+/g, "");
  try {
    const dbNum = await prisma.phoneNumber.findUnique({
      where: { number: cleanNumber },
    });

    const analysis = analyzeNumber(cleanNumber);
    const riskScore = reqRiskScore !== undefined ? Number(reqRiskScore) : (dbNum ? dbNum.riskScore : 0);
    
    // Find reported location details if any
    let province = reqProvince || "";
    let district = reqDistrict || "";
    let commune = reqCommune || "";
    let village = reqVillage || "";
    let location = reqProvince || analysis.location;

    if (!province && dbNum) {
      const lastReport = await prisma.report.findFirst({
        where: { numberId: dbNum.id },
        orderBy: { createdAt: "desc" }
      });
      if (lastReport) {
        province = lastReport.province || "";
        district = lastReport.district || "";
        commune = lastReport.commune || "";
        village = lastReport.village || "";
        location = lastReport.province || analysis.location;
      }
    }

    const carrier = reqCarrier || analysis.carrier;
    const category = reqCategory || (dbNum ? (await prisma.report.findFirst({
      where: { numberId: dbNum.id },
      select: { category: true }
    }))?.category || "OTHER" : "OTHER");

    const callPayload = {
      number: cleanNumber,
      riskScore,
      carrier,
      country: analysis.country,
      location,
      province,
      district,
      commune,
      village,
      category,
      lat: reqLat ? Number(reqLat) : undefined,
      lng: reqLng ? Number(reqLng) : undefined,
      locationSource: reqLocationSource || (reqLat && reqLng ? "GPS Cellular Lock" : "Carrier Network (Estimated)")
    };

    if (currentActiveCall && currentActiveCall.number === cleanNumber) {
      currentActiveCall = {
        ...currentActiveCall,
        ...callPayload
      };
    } else {
      currentActiveCall = {
        ...callPayload,
        status: "RINGING",
        pairingToken: crypto.randomUUID()
      };
    }

    broadcastIncomingCall(currentActiveCall);

    return res.json({ message: "Call event broadcasted successfully", data: currentActiveCall });
  } catch (err: any) {
    logger.error(`Error detecting call event: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function detectTwilioCall(req: Request, res: Response) {
  const number = req.body.From;
  if (!number) {
    res.type("text/xml");
    return res.status(400).send("<Response><Reject reason='busy'/></Response>");
  }

  const cleanNumber = number.trim().replace(/\s+/g, "");
  try {
    const dbNum = await prisma.phoneNumber.findUnique({
      where: { number: cleanNumber },
    });

    const analysis = analyzeNumber(cleanNumber);
    const riskScore = dbNum ? dbNum.riskScore : 0;
    
    let province = req.body.FromState || "";
    let district = req.body.FromCity || "";
    let commune = "";
    let village = "";
    let location = province || analysis.location;

    if (!province && dbNum) {
      const lastReport = await prisma.report.findFirst({
        where: { numberId: dbNum.id },
        orderBy: { createdAt: "desc" }
      });
      if (lastReport) {
        province = lastReport.province || "";
        district = lastReport.district || "";
        commune = lastReport.commune || "";
        village = lastReport.village || "";
        location = lastReport.province || analysis.location;
      }
    }

    const category = dbNum ? (await prisma.report.findFirst({
      where: { numberId: dbNum.id },
      select: { category: true }
    }))?.category || "OTHER" : "OTHER";

    const callPayload = {
      number: cleanNumber,
      riskScore,
      carrier: analysis.carrier,
      country: analysis.country,
      location,
      province,
      district,
      commune,
      village,
      category,
      lat: undefined,
      lng: undefined
    };

    if (currentActiveCall && currentActiveCall.number === cleanNumber) {
      currentActiveCall = {
        ...currentActiveCall,
        ...callPayload
      };
    } else {
      currentActiveCall = {
        ...callPayload,
        status: "RINGING",
        pairingToken: crypto.randomUUID()
      };
    }

    broadcastIncomingCall(currentActiveCall);

    res.type("text/xml");
    if (riskScore >= 75) {
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-US" voice="alice">Warning! ScamShield has identified this incoming number as high risk. Please hang up immediately.</Say>
  <Reject reason="rejected"/>
</Response>`);
    } else {
      return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-US" voice="alice">ScamShield verified. Incoming connection is secure.</Say>
  <Dial></Dial>
</Response>`);
    }
  } catch (err: any) {
    logger.error(`Error detecting Twilio call event: ${err.message}`);
    res.type("text/xml");
    return res.status(500).send("<Response><Reject reason='busy'/></Response>");
  }
}

export async function getLocalIp(req: Request, res: Response) {
  try {
    if (process.env.NODE_ENV === "production") {
      logger.warn(`Local IP discovery blocked in production mode from remote IP: ${req.ip}`);
      return res.status(403).json({ error: "Access to local IP configuration is disabled in production." });
    }
    const interfaces = os.networkInterfaces();
    let localIp = "localhost";
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (iface) {
        for (let i = 0; i < iface.length; i++) {
          const alias = iface[i];
          // Support IPv4 and check that it is not loopback
          if (alias.family === "IPv4" && !alias.internal) {
            localIp = alias.address;
            break;
          }
        }
      }
      if (localIp !== "localhost") break;
    }
    return res.json({ ip: localIp });
  } catch (err: any) {
    logger.error(`Error getting local network IP: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getActiveCall(req: Request, res: Response) {
  return res.json({ activeCall: currentActiveCall });
}

export async function answerActiveCall(req: Request, res: Response) {
  const { token } = req.body;
  if (!currentActiveCall) {
    return res.status(404).json({ error: "No active call found" });
  }
  if (currentActiveCall.pairingToken !== token) {
    return res.status(403).json({ error: "Forbidden: invalid pairing token" });
  }
  currentActiveCall.status = "ACTIVE";
  currentActiveCall.startTime = Date.now();

  broadcastAnswerCall(currentActiveCall);

  logger.info(`Call answered: ${currentActiveCall.number}`);
  return res.json({ message: "Call answered successfully", data: currentActiveCall });
}

export async function hangupActiveCall(req: Request, res: Response) {
  const { token } = req.body;
  if (currentActiveCall) {
    if (currentActiveCall.pairingToken !== token) {
      return res.status(403).json({ error: "Forbidden: invalid pairing token" });
    }
    logger.info(`Call hung up: ${currentActiveCall.number}`);
  }
  currentActiveCall = null;

  broadcastHangupCall();

  return res.json({ message: "Call hung up successfully" });
}

export async function updateActiveCallLocation(req: Request, res: Response) {
  const { lat, lng, token } = req.body;
  if (!currentActiveCall) {
    return res.status(404).json({ error: "No active call found to update location" });
  }
  if (currentActiveCall.pairingToken !== token) {
    return res.status(403).json({ error: "Forbidden: invalid pairing token" });
  }

  if (lat !== undefined) currentActiveCall.lat = Number(lat);
  if (lng !== undefined) currentActiveCall.lng = Number(lng);
  currentActiveCall.location = "GPS Cellular Lock";
  currentActiveCall.locationSource = "GPS Cellular Lock";

  broadcastIncomingCall(currentActiveCall); // Broadcast updated payload to all clients!

  logger.info(`Active call location updated: ${currentActiveCall.number} to (${lat}, ${lng})`);
  return res.json({ message: "Location updated successfully", data: currentActiveCall });
}


