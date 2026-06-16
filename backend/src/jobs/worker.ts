import { Queue, Worker, Job } from "bullmq";
import prisma from "../prisma/prismaClient.js";
import { calculateDetailedRiskScore, ReportInput } from "../services/riskEngine.js";
import { delCache, setCache } from "../utils/redis.js";
import logger from "../utils/logger.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
let connectionOpts: any = { host: "127.0.0.1", port: 6379 };

try {
  const parsed = new URL(redisUrl);
  connectionOpts = {
    host: parsed.hostname || "127.0.0.1",
    port: parsed.port ? parseInt(parsed.port) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
  };
} catch (e) {
  logger.warn("Could not parse REDIS_URL for BullMQ connection, using default localhost connection options");
}

// ── Queue Definitions ──────────────────────────────────────────────────────────
export const jobQueue = new Queue("scamshield-jobs", {
  connection: connectionOpts,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
  },
});

// ── Shared Recalculation Logic ───────────────────────────────────────────────
export async function recalculatePhoneNumberRisk(numberId: string): Promise<number> {
  const phoneNumber = await prisma.phoneNumber.findUnique({
    where: { id: numberId },
  });

  if (!phoneNumber) return 0;

  // Fetch all reports except rejected ones
  const reports = await prisma.report.findMany({
    where: {
      numberId: numberId,
      status: { not: "REJECTED" },
    },
    include: {
      user: {
        select: {
          role: true,
          reporterScore: true,
        },
      },
      evidence: {
        select: {
          id: true,
        },
      },
    },
  });

  const totalReport = reports.length;

  const reportInputs: ReportInput[] = reports.map((r) => ({
    createdAt: r.createdAt,
    status: r.status,
    evidenceCount: r.evidence.length,
    reporterRole: r.user.role,
    reporterScore: r.user.reporterScore,
    category: r.category,
  }));

  const newRiskScore = calculateDetailedRiskScore({
    reports: reportInputs,
    countryCode: phoneNumber.countryCode || undefined,
  });

  await prisma.phoneNumber.update({
    where: { id: numberId },
    data: {
      riskScore: newRiskScore,
      totalReport: totalReport,
    },
  });

  // Invalidate search cache
  await delCache(`cache:number:${phoneNumber.number}`);

  logger.info(`🔄 [Job Engine] Recalculated risk for ${phoneNumber.number}: ${newRiskScore}%`);
  return newRiskScore;
}

// ── Worker Job Handler ────────────────────────────────────────────────────────
const worker = new Worker(
  "scamshield-jobs",
  async (job: Job) => {
    logger.info(`👷 [Job Engine] Processing background job: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case "RECALCULATE_RISK": {
        const { numberId } = job.data;
        await recalculatePhoneNumberRisk(numberId);
        break;
      }

      case "NIGHTLY_RISK_RECALC": {
        // Find all phone numbers that have reports and update them
        const phoneNumbers = await prisma.phoneNumber.findMany({
          select: { id: true, number: true },
        });

        logger.info(`✨ Running Nightly Risk Recalculation on ${phoneNumbers.length} registered numbers...`);
        for (const num of phoneNumbers) {
          await recalculatePhoneNumberRisk(num.id);
        }
        logger.info("✅ Nightly Risk Recalculation finished.");
        break;
      }

      case "EMAIL_NOTIFIER": {
        const { email, subject, body } = job.data;
        // Mock email transport - Log to winston
        logger.info(`✉️ [SMTP Simulator] Sending email to ${email}`);
        logger.info(`Subject: ${subject}`);
        logger.info(`Body snippet: ${body.substring(0, 100)}...`);
        break;
      }

      case "STATS_COMPILER": {
        logger.info("📊 Aggregating statistics...");
        // Collect dashboard statistics
        const totalScamNumbers = await prisma.phoneNumber.count({
          where: { riskScore: { gte: 30 } },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const reportsToday = await prisma.report.count({
          where: { createdAt: { gte: today } },
        });

        const categoryGroup = await prisma.report.groupBy({
          by: ["category"],
          _count: { id: true },
        });
        const categoryDistribution = categoryGroup.map((g) => ({
          category: g.category,
          count: g._count.id,
        }));

        const countryGroup = await prisma.phoneNumber.groupBy({
          by: ["countryCode"],
          _count: { id: true },
        });
        const countryDistribution = countryGroup.map((g) => ({
          countryCode: g.countryCode || "UNKNOWN",
          count: g._count.id,
        }));

        const provinceGroup = await prisma.report.groupBy({
          by: ["province"],
          where: { province: { not: null } },
          _count: { id: true },
        });
        const provinceDistribution = provinceGroup
          .filter((g) => g.province && g.province.trim() !== "")
          .map((g) => ({
            province: g.province as string,
            count: g._count.id,
          }))
          .sort((a, b) => b.count - a.count);

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

        const statsData = {
          totalScamNumbers,
          reportsToday,
          categoryDistribution,
          countryDistribution,
          provinceDistribution,
          highestRiskNumbers,
          compiledAt: new Date(),
        };

        // Cache dashboard statistics in Redis for 24 hours
        await setCache("cache:dashboard:stats", JSON.stringify(statsData), 86400);
        logger.info("✅ Aggregated statistics successfully saved to cache.");
        break;
      }

      default:
        logger.warn(`Unknown job name: ${job.name}`);
    }
  },
  {
    connection: connectionOpts,
  }
);

worker.on("completed", (job) => {
  logger.info(`✅ [Job Engine] Job ${job.name} completed successfully.`);
});

worker.on("failed", (job, err) => {
  logger.error(`❌ [Job Engine] Job ${job?.name} failed: ${err.message}`);
});

export default worker;
