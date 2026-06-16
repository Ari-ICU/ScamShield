import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../prisma/prismaClient.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/auth.js";
import { sendMail } from "../services/mailer.js";
import logger from "../utils/logger.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function register(req: Request, res: Response) {
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
    const userRole = "USER";
    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const hashedVerificationToken = hashToken(rawVerificationToken);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: userRole,
        isEmailVerified: false,
        emailVerificationToken: hashedVerificationToken,
      },
    });

    logger.info(`User registered successfully: ${email} (${userRole})`);

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });

    // Persist refresh token in DB
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Set HttpOnly Cookie
    res.cookie("scamshield_refresh", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });

    // Send verification email asynchronously using the raw token
    sendMail({
      to: user.email,
      subject: "Verify your email address - ScamShield",
      text: `Welcome to ScamShield! Please verify your email by clicking the link or using the code: ${rawVerificationToken}`,
      html: `<p>Welcome to ScamShield!</p><p>Please verify your email using this token: <strong>${rawVerificationToken}</strong></p>`,
    });

    return res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified },
      accessToken,
    });
  } catch (err: any) {
    logger.error(`Error in registration: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check account lockout status
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      return res.status(423).json({
        error: `Account is locked. Please try again after ${user.lockoutUntil.toLocaleTimeString()}`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const attempts = user.failedLoginAttempts + 1;
      if (attempts >= 5) {
        const lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockoutUntil,
          },
        });
        return res.status(423).json({
          error: "Too many failed login attempts. Account is locked for 15 minutes.",
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
          },
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }
    }

    // Enforce email verification
    if (!user.isEmailVerified) {
      return res.status(403).json({ error: "Verify email first" });
    }

    // Reset failed login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    logger.info(`User logged in successfully: ${email}`);

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });

    // Persist refresh token in DB
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set HttpOnly Cookie
    res.cookie("scamshield_refresh", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });

    return res.json({
      user: { id: user.id, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified },
      accessToken,
    });
  } catch (err: any) {
    logger.error(`Error in login: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.scamshield_refresh;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    // Reuse detection
    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      if (tokenRecord) {
        // Token was revoked previously - potential attack! Revoke all tokens for this user
        await prisma.refreshToken.updateMany({
          where: { userId: tokenRecord.userId },
          data: { revoked: true },
        });
        logger.warn(`Suspicious refresh token reuse detected for userId: ${tokenRecord.userId}. Revoking all tokens.`);
      }
      res.clearCookie("scamshield_refresh", { path: "/api/auth" });
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.clearCookie("scamshield_refresh", { path: "/api/auth" });
      return res.status(401).json({ error: "User no longer exists" });
    }

    // Rotate refresh token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set rotated token in HttpOnly Cookie
    res.cookie("scamshield_refresh", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });

    return res.json({
      accessToken: newAccessToken,
      user: { id: user.id, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified }
    });
  } catch (err: any) {
    logger.warn(`Failed token refresh attempt: ${err.message}`);
    res.clearCookie("scamshield_refresh", { path: "/api/auth" });
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.scamshield_refresh;
  
  try {
    if (refreshToken) {
      // Delete the refresh token from DB so it cannot be used again
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }
  } catch (err: any) {
    logger.error(`Error deleting refresh token in logout: ${err.message}`);
  }

  res.clearCookie("scamshield_refresh", {
    path: "/api/auth",
  });
  
  return res.json({ message: "Logged out successfully" });
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Verification token is required" });
  }

  try {
    const hashedToken = hashToken(token);
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: hashedToken },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

    return res.json({ message: "Email verified successfully" });
  } catch (err: any) {
    logger.error(`Error in email verification: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return 200 even if user not found to prevent user enumeration
      return res.json({ message: "If that email exists, reset instructions have been sent." });
    }

    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = hashToken(rawResetToken);
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedResetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Send reset instructions with raw token
    sendMail({
      to: user.email,
      subject: "Password Reset Request - ScamShield",
      text: `You requested a password reset. Please use the following token to reset your password: ${rawResetToken}`,
      html: `<p>You requested a password reset.</p><p>Please reset your password using this token: <strong>${rawResetToken}</strong></p>`,
    });

    return res.json({ message: "If that email exists, reset instructions have been sent." });
  } catch (err: any) {
    logger.error(`Error in forgot password: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const hashedToken = hashToken(token);
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gte: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired password reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return res.json({ message: "Password reset successfully" });
  } catch (err: any) {
    logger.error(`Error in reset password: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}
