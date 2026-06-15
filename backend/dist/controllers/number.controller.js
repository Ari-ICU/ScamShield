import prisma from "../prisma/prismaClient.js";
import logger from "../utils/logger.js";
import { broadcastIncomingCall, broadcastAnswerCall, broadcastHangupCall } from "../socket/socket.js";
import os from "os";
import crypto from "crypto";
export let currentActiveCall = null;
export function analyzeNumber(num) {
    const clean = num.replace(/[^\d+]/g, "");
    // 1. Detect Country
    let country = "Unknown";
    let code = "UNKNOWN";
    if (clean.startsWith("+855") || clean.startsWith("855") || /^0\d{8,9}$/.test(clean)) {
        country = "Cambodia";
        code = "KH";
    }
    else if (clean.startsWith("+1") || clean.startsWith("1")) {
        country = "United States/Canada";
        code = "US";
    }
    else if (clean.startsWith("+44") || clean.startsWith("44")) {
        country = "United Kingdom";
        code = "GB";
    }
    else if (clean.startsWith("+66") || clean.startsWith("66")) {
        country = "Thailand";
        code = "TH";
    }
    else if (clean.startsWith("+84") || clean.startsWith("84")) {
        country = "Vietnam";
        code = "VN";
    }
    else if (clean.startsWith("+65") || clean.startsWith("65")) {
        country = "Singapore";
        code = "SG";
    }
    else if (clean.startsWith("+60") || clean.startsWith("60")) {
        country = "Malaysia";
        code = "MY";
    }
    else if (clean.startsWith("+856") || clean.startsWith("856")) {
        country = "Laos";
        code = "LA";
    }
    else if (clean.startsWith("+")) {
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
        }
        else if (local.startsWith("855")) {
            local = "0" + local.slice(3);
        }
        // Ensure it looks like 0XXXXXXXX (9 to 10 digits)
        if (/^0\d{8,9}$/.test(local)) {
            const prefix2 = local.slice(1, 3); // 2 digits: e.g. 12, 15, 23
            // Landline area codes mapping
            const landlines = {
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
            }
            else {
                // Mobile operators mapping
                const smartPrefixes = ["10", "15", "16", "69", "70", "81", "86", "87", "93", "96", "98"];
                const cellcardPrefixes = ["11", "12", "17", "61", "76", "77", "78", "79", "85", "89", "92", "99"];
                const metfonePrefixes = ["31", "60", "66", "67", "68", "71", "88", "90", "97"];
                const seatelPrefixes = ["18"];
                const cootelPrefixes = ["38"];
                location = "National Mobile";
                if (smartPrefixes.includes(prefix2)) {
                    carrier = "Smart Axiata";
                }
                else if (cellcardPrefixes.includes(prefix2)) {
                    carrier = "Cellcard (CamGSM)";
                }
                else if (metfonePrefixes.includes(prefix2)) {
                    carrier = "Metfone (Viettel)";
                }
                else if (seatelPrefixes.includes(prefix2)) {
                    carrier = "Seatel";
                }
                else if (cootelPrefixes.includes(prefix2)) {
                    carrier = "Cootel";
                }
                else {
                    carrier = "VoIP / Unknown Carrier";
                }
            }
        }
    }
    else if (code !== "UNKNOWN" && code !== "INT") {
        location = "International Call";
        carrier = "International Operator";
    }
    else if (code === "INT") {
        location = "International Gateway";
        carrier = "VoIP Routing";
    }
    return { country, code, carrier, location };
}
export async function searchNumber(req, res) {
    const { phone } = req.params;
    if (!phone) {
        return res.status(400).json({ error: "Phone number parameter is required" });
    }
    // Sanitize
    const cleanNumber = phone.trim().replace(/\s+/g, "");
    try {
        const dbNum = await prisma.phoneNumber.findUnique({
            where: { number: cleanNumber },
            include: {
                reports: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
        });
        const analysis = analyzeNumber(cleanNumber);
        if (!dbNum) {
            // Return safe schema for unregistered numbers without writing to DB yet
            return res.json({
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
                createdAt: new Date(),
            });
        }
        // Determine risk level label based on riskScore
        let riskLevel = "SAFE";
        if (dbNum.riskScore >= 75) {
            riskLevel = "HIGH_RISK";
        }
        else if (dbNum.riskScore >= 30) {
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
        logger.info(`Looked up number: ${cleanNumber} (Score: ${dbNum.riskScore}, Level: ${riskLevel})`);
        return res.json({
            id: dbNum.id,
            number: dbNum.number,
            country: analysis.country,
            countryCode: dbNum.countryCode || analysis.code,
            carrier: analysis.carrier,
            location: analysis.location,
            riskScore: dbNum.riskScore,
            riskLevel,
            totalReports: dbNum.totalReport,
            reports: dbNum.reports,
            recentReportsCount,
            createdAt: dbNum.createdAt,
        });
    }
    catch (err) {
        logger.error(`Error searching number ${cleanNumber}: ${err.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
}
export async function detectCall(req, res) {
    const { number, province: reqProvince, district: reqDistrict, commune: reqCommune, village: reqVillage, carrier: reqCarrier, category: reqCategory, riskScore: reqRiskScore, lat: reqLat, lng: reqLng, locationSource: reqLocationSource } = req.body;
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
        }
        else {
            currentActiveCall = {
                ...callPayload,
                status: "RINGING",
                pairingToken: crypto.randomUUID()
            };
        }
        broadcastIncomingCall(currentActiveCall);
        return res.json({ message: "Call event broadcasted successfully", data: currentActiveCall });
    }
    catch (err) {
        logger.error(`Error detecting call event: ${err.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
}
export async function detectTwilioCall(req, res) {
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
        }
        else {
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
        }
        else {
            return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-US" voice="alice">ScamShield verified. Incoming connection is secure.</Say>
  <Dial></Dial>
</Response>`);
        }
    }
    catch (err) {
        logger.error(`Error detecting Twilio call event: ${err.message}`);
        res.type("text/xml");
        return res.status(500).send("<Response><Reject reason='busy'/></Response>");
    }
}
export async function getLocalIp(req, res) {
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
            if (localIp !== "localhost")
                break;
        }
        return res.json({ ip: localIp });
    }
    catch (err) {
        logger.error(`Error getting local network IP: ${err.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
}
function getDetectUrl(req) {
    const providedIp = req.query.ip;
    if (providedIp && providedIp !== "localhost" && providedIp !== "127.0.0.1") {
        const port = process.env.PORT || "4000";
        if (providedIp.includes(":") || providedIp.includes("//")) {
            return providedIp.startsWith("http") ? providedIp : `http://${providedIp}`;
        }
        return `http://${providedIp}:${port}/api/calls/detect`;
    }
    const host = req.get("host") || "localhost:4000";
    const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    return `${protocol}://${host}/api/calls/detect`;
}
export async function downloadMacroDroid(req, res) {
    const detectUrl = getDetectUrl(req);
    const macroJson = {
        "macroName": "ScamShield Forwarder",
        "triggerList": [
            {
                "triggerType": "Incoming Call",
                "incomingCallOption": "Any Number"
            }
        ],
        "actionList": [
            {
                "actionType": "HTTP Request",
                "url": detectUrl,
                "method": "POST",
                "contentType": "application/json",
                "body": "{\"number\":\"{call_number}\"}"
            }
        ]
    };
    res.setHeader("Content-Disposition", "attachment; filename=ScamShield_MacroDroid.json");
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(macroJson, null, 2));
}
export async function downloadTasker(req, res) {
    const detectUrl = getDetectUrl(req);
    const xml = `<TaskerData sr="tasker_export" ve="5.12.22">
  <Profile sr="prof99" ve="7">
    <cdate>${Date.now()}</cdate>
    <edate>${Date.now()}</edate>
    <id>999</id>
    <mid0>9999</mid0>
    <nme>ScamShield Forwarder</nme>
    <Event sr="con0" ve="2">
      <code>905</code>
      <pri>0</pri>
      <Str sr="arg0" ve="3"/>
    </Event>
  </Profile>
  <Task sr="task99">
    <cdate>${Date.now()}</cdate>
    <edate>${Date.now()}</edate>
    <id>9999</id>
    <nme>Forward to ScamShield</nme>
    <Action sr="act0" ve="7">
      <code>339</code>
      <Int sr="arg0" val="1"/>
      <Str sr="arg1" ve="3">${detectUrl}</Str>
      <Str sr="arg2" ve="3">{"number":"%CNUM"}</Str>
      <Str sr="arg3" ve="3">Content-Type:application/json</Str>
      <Int sr="arg4" val="30"/>
    </Action>
  </Task>
</TaskerData>`;
    res.setHeader("Content-Disposition", "attachment; filename=ScamShield_Tasker.prf.xml");
    res.setHeader("Content-Type", "text/xml");
    return res.send(xml);
}
export async function getActiveCall(req, res) {
    return res.json({ activeCall: currentActiveCall });
}
export async function answerActiveCall(req, res) {
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
export async function hangupActiveCall(req, res) {
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
export async function updateActiveCallLocation(req, res) {
    const { lat, lng, token } = req.body;
    if (!currentActiveCall) {
        return res.status(404).json({ error: "No active call found to update location" });
    }
    if (currentActiveCall.pairingToken !== token) {
        return res.status(403).json({ error: "Forbidden: invalid pairing token" });
    }
    if (lat !== undefined)
        currentActiveCall.lat = Number(lat);
    if (lng !== undefined)
        currentActiveCall.lng = Number(lng);
    currentActiveCall.location = "GPS Cellular Lock";
    currentActiveCall.locationSource = "GPS Cellular Lock";
    broadcastIncomingCall(currentActiveCall); // Broadcast updated payload to all clients!
    logger.info(`Active call location updated: ${currentActiveCall.number} to (${lat}, ${lng})`);
    return res.json({ message: "Location updated successfully", data: currentActiveCall });
}
