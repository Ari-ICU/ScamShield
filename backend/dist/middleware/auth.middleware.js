import { verifyAccessToken } from "../utils/auth.js";
import logger from "../utils/logger.js";
export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Access token is missing" });
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ error: "Token format must be Bearer <token>" });
    }
    const token = parts[1];
    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    }
    catch (err) {
        logger.warn(`Failed token verification attempt: ${err.message}`);
        return res.status(403).json({ error: "Invalid or expired access token" });
    }
}
export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    next();
}
