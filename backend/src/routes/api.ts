import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import * as numberController from "../controllers/number.controller.js";
import * as reportController from "../controllers/report.controller.js";
import * as adminController from "../controllers/admin.controller.js";
import * as appealController from "../controllers/appeal.controller.js";
import * as watchlistController from "../controllers/watchlist.controller.js";
import * as notificationController from "../controllers/notification.controller.js";
import { authenticateJWT, requireAdmin } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.js";

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
router.post("/auth/logout", authController.logout);
router.post("/auth/verify-email", authController.verifyEmail);
router.post("/auth/forgot-password", authController.forgotPassword);
router.post("/auth/reset-password", authController.resetPassword);

// Phone Number Search Lookup
router.get("/numbers/search/:phone", numberController.searchNumber);
router.get("/numbers/popular", numberController.getPopularSearches);
router.get("/calls/lookup/:phone", numberController.lookupNumber); // Android Caller ID lookup
router.post("/calls/detect", callsSecretGuard, numberController.detectCall);
router.post("/calls/twilio", numberController.detectTwilioCall);
router.get("/network-ip", numberController.getLocalIp);
router.get("/calls/active", numberController.getActiveCall);
router.post("/calls/active/answer", numberController.answerActiveCall);
router.post("/calls/active/hangup", numberController.hangupActiveCall);
router.post("/calls/active/location", numberController.updateActiveCallLocation);

// Watchlist Routes
router.get("/watchlist", authenticateJWT, watchlistController.getWatchlist);
router.post("/watchlist", authenticateJWT, watchlistController.addToWatchlist);
router.delete("/watchlist/:numberId", authenticateJWT, watchlistController.removeFromWatchlist);

// Notification Routes
router.get("/notifications", authenticateJWT, notificationController.getNotifications);
router.patch("/notifications/read-all", authenticateJWT, notificationController.markAllAsRead);
router.patch("/notifications/:id/read", authenticateJWT, notificationController.markAsRead);

// Community Report Routes
router.post("/reports", authenticateJWT, upload.array("evidence", 5), reportController.createReport);
router.get("/reports", reportController.getRecentReports);

// Public Appeal Route
router.post("/appeals", upload.single("proof"), appealController.submitAppeal);

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

// Admin Appeals & Audit Logs Routes
router.get("/admin/appeals", authenticateJWT, requireAdmin, appealController.getAppeals);
router.patch("/admin/appeals/:id", authenticateJWT, requireAdmin, appealController.resolveAppeal);
router.get("/admin/audit-logs", authenticateJWT, requireAdmin, adminController.getAuditLogs);

// API Documentation routes
import swaggerRouter from "./swagger.js";
router.use(swaggerRouter);

export default router;


