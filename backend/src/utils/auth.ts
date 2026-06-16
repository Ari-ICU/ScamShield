import jwt from "jsonwebtoken";

if (process.env.NODE_ENV !== "test") {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET missing");
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET missing");
  }
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test_access_secret_key";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret_key";

export function generateAccessToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function generateRefreshToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET) as { id: string; email: string; role: string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as { id: string; email: string; role: string };
}
