import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { initSocket } from "./socket/socket.js";
import apiRouter from "./routes/api.js";
import logger from "./utils/logger.js";
import "./jobs/worker.js";
import { jobQueue } from "./jobs/worker.js";

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
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      const isLocal = /^(https?:\/\/)?(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (isLocal) {
        return callback(null, true);
      }
    }
    if (origin === allowedOrigin) {
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

// Serve static uploads
app.use("/uploads", express.static("uploads"));


// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Global Error Handler caught error: ${err.message || err}`);
  return res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  logger.info(`🚀 ScamShield Cambodia API ready on port ${PORT}`);
});

export default app;
