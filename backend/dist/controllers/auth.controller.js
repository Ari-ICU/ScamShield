import bcrypt from "bcryptjs";
import prisma from "../prisma/prismaClient.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/auth.js";
import logger from "../utils/logger.js";
export async function register(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }
    // Password minimum length
    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        // Role is always USER on self-registration; use admin panel to promote
        const userRole = "USER";
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: userRole,
            },
        });
        logger.info(`User registered successfully: ${email} (${userRole})`);
        const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
        const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });
        return res.status(201).json({
            user: { id: user.id, email: user.email, role: user.role },
            accessToken,
            refreshToken,
        });
    }
    catch (err) {
        logger.error(`Error in registration: ${err.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
}
export async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        logger.info(`User logged in successfully: ${email}`);
        const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
        const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });
        return res.json({
            user: { id: user.id, email: user.email, role: user.role },
            accessToken,
            refreshToken,
        });
    }
    catch (err) {
        logger.error(`Error in login: ${err.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
}
export async function refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
    }
    try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return res.status(401).json({ error: "User no longer exists" });
        }
        const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
        const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });
        return res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    }
    catch (err) {
        logger.warn(`Failed token refresh attempt: ${err.message}`);
        return res.status(403).json({ error: "Invalid or expired refresh token" });
    }
}
