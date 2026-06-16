import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import prisma from "./prisma/prismaClient.js";
import { initSocket } from "./socket/socket.js";
import apiRouter from "./routes/api.js";
import logger from "./utils/logger.js";
import "./jobs/worker.js";
import { jobQueue } from "./jobs/worker.js";

import cookieParser from "cookie-parser";
import { authenticateJWT } from "./middleware/auth.middleware.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Schedule background jobs
jobQueue.add("NIGHTLY_RISK_RECALC", {}, {
  repeat: { pattern: "0 0 * * *" }
}).catch((err) => {
  logger.error(`Failed to schedule NIGHTLY_RISK_RECALC repeatable job: ${err.message}`);
});

jobQueue.add("STATS_COMPILER", {}).catch((err) => {
  logger.error(`Failed to schedule initial STATS_COMPILER job: ${err.message}`);
});

// Initialize Socket.io
initSocket(httpServer);

// Middleware
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "*", "ws:", "wss:"],
    },
  },
}));
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === "production") {
      if (origin === allowedOrigin) {
        return callback(null, true);
      }
      return callback(null, false);
    }
    
    // Always allow local connections from developer machine on any port in development
    const isLocal = /^(https?:\/\/)?(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
    if (isLocal || origin === allowedOrigin) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Log HTTP requests
app.use((req, _res, next) => {
  logger.info(`HTTP ${req.method} ${req.url}`);
  next();
});

// Mount API routes
app.use("/api", apiRouter);

// Serve static uploads (protected)
app.use("/uploads", authenticateJWT, express.static("uploads"));


// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Global Error Handler caught error: ${err.message || err}`);
  return res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

async function seedDefaultAdmin() {
  try {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      logger.info("ℹ️ DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not set. Skipping default administrator seeding.");
      return;
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
          isEmailVerified: true,
          reporterProfile: {
            create: {
              reputationScore: 100,
              verificationLevel: "VERIFIED",
            }
          }
        }
      });
      logger.info(`✅ Default administrator account seeded successfully (${adminEmail})`);
    } else {
      logger.info("ℹ️ Default administrator account already exists.");
    }
  } catch (err: any) {
    logger.error(`❌ Failed to seed default administrator: ${err.message}`);
  }
}

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== "test") {
  seedDefaultAdmin().then(() => {
    httpServer.listen(PORT, () => {
      logger.info(`🚀 ScamShield Cambodia API ready on port ${PORT}`);
    });
  });
}

export default app;
