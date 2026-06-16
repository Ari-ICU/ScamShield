import { describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app.js";
import { prismaMock } from "./setup.js";
import { generateRefreshToken } from "../utils/auth.js";

describe("Auth Endpoints", () => {
  describe("POST /api/auth/register", () => {
    it("should successfully register a new user", async () => {
      const email = "test@example.com";
      const password = "password123";

      prismaMock.user.findUnique.mockResolvedValue(null as any);
      prismaMock.user.create.mockResolvedValue({
        id: "mock-user-id",
        email,
        password: "hashedpassword",
        role: "USER",
        reporterScore: 0,
        createdAt: new Date(),
      } as any);

      const response = await request(app)
        .post("/api/auth/register")
        .send({ email, password });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toEqual({
        id: "mock-user-id",
        email,
        role: "USER",
      });
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it("should return 400 for missing fields", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email and password are required");
    });

    it("should return 400 for invalid email format", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "invalidemail", password: "password123" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
    });

    it("should return 400 for short password", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "short" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Password must be at least 8 characters");
    });

    it("should return 400 if user already exists", async () => {
      const email = "existing@example.com";
      prismaMock.user.findUnique.mockResolvedValue({
        id: "existing-id",
        email,
      } as any);

      const response = await request(app)
        .post("/api/auth/register")
        .send({ email, password: "password123" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("User already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should log in successfully with valid credentials", async () => {
      const email = "test@example.com";
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      prismaMock.user.findUnique.mockResolvedValue({
        id: "mock-user-id",
        email,
        password: hashedPassword,
        role: "USER",
      } as any);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toEqual({
        id: "mock-user-id",
        email,
        role: "USER",
      });
    });

    it("should return 401 for incorrect password", async () => {
      const email = "test@example.com";
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      prismaMock.user.findUnique.mockResolvedValue({
        id: "mock-user-id",
        email,
        password: hashedPassword,
        role: "USER",
      } as any);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrongpassword" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should return 401 if user is not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null as any);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "nonexistent@example.com", password: "password123" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should return new tokens with a valid refresh token", async () => {
      const userPayload = { id: "mock-user-id", email: "test@example.com", role: "USER" };
      const validRefreshToken = generateRefreshToken(userPayload);

      prismaMock.user.findUnique.mockResolvedValue({
        id: "mock-user-id",
        email: "test@example.com",
        role: "USER",
      } as any);

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: validRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
    });

    it("should return 400 if refresh token is missing", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Refresh token is required");
    });

    it("should return 403 for expired or invalid refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalidtoken" });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Invalid or expired refresh token");
    });
  });
});
