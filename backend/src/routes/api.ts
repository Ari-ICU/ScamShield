import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import * as numberController from "../controllers/number.controller.js";
import * as reportController from "../controllers/report.controller.js";
import * as adminController from "../controllers/admin.controller.js";
import { authenticateJWT, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reports submitted, please try again later." },
});

// ── Calls Secret Guard ────────────────────────────────────────────────────────
// Protects the unauthenticated call-detect webhook from unauthorized broadcasts.
function callsSecretGuard(req: Request, res: Response, next: NextFunction) {
  const callsSecret = process.env.CALLS_SECRET;
  // If no secret is configured (dev mode), allow through
  if (!callsSecret) return next();
  const provided = req.headers["x-calls-secret"] || req.body?.secret;
  if (provided !== callsSecret) {
    return res.status(403).json({ error: "Forbidden: invalid calls secret" });
  }
  next();
}

// Authentication Routes
router.post("/auth/register", authLimiter, authController.register);
router.post("/auth/login", authLimiter, authController.login);
router.post("/auth/refresh", authLimiter, authController.refresh);

// Phone Number Search Lookup
router.get("/numbers/search/:phone", numberController.searchNumber);
router.post("/calls/detect", callsSecretGuard, numberController.detectCall);
router.post("/calls/twilio", numberController.detectTwilioCall);
router.get("/network-ip", numberController.getLocalIp);
router.get("/calls/download-macrodroid", numberController.downloadMacroDroid);
router.get("/calls/download-tasker", numberController.downloadTasker);
router.get("/calls/active", numberController.getActiveCall);
router.post("/calls/active/answer", numberController.answerActiveCall);
router.post("/calls/active/hangup", numberController.hangupActiveCall);
router.post("/calls/active/location", numberController.updateActiveCallLocation);

// Community Report Routes
router.post("/reports", authenticateJWT, reportLimiter, reportController.createReport);
router.get("/reports", reportController.getRecentReports);

// Dashboard Statistics (Public/Authenticated)
router.get("/dashboard/stats", adminController.getStats);

// Admin Moderation & Management Routes
router.get("/admin/reports", authenticateJWT, requireAdmin, adminController.getReports);
router.patch("/admin/reports/:id", authenticateJWT, requireAdmin, adminController.updateReport);
router.delete("/admin/reports/:id", authenticateJWT, requireAdmin, adminController.deleteReport);
router.get("/admin/users", authenticateJWT, requireAdmin, adminController.getUsers);
router.patch("/admin/users/:id/role", authenticateJWT, requireAdmin, adminController.updateUserRole);
router.delete("/admin/users/:id", authenticateJWT, requireAdmin, adminController.deleteUser);
router.get("/admin/numbers", authenticateJWT, requireAdmin, adminController.getNumbers);
router.post("/admin/numbers", authenticateJWT, requireAdmin, adminController.createNumber);
router.get("/admin/numbers/export", authenticateJWT, requireAdmin, adminController.exportNumbers);
router.delete("/admin/numbers/:id", authenticateJWT, requireAdmin, adminController.deleteNumber);

export default router;

