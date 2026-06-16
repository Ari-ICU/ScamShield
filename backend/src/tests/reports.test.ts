import { describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import app from "../app.js";
import { prismaMock } from "./setup.js";
import { generateAccessToken } from "../utils/auth.js";

describe("Reports Endpoints", () => {
  const mockToken = generateAccessToken({
    id: "mock-user-id",
    email: "reporter@example.com",
    role: "USER",
  });

  describe("POST /api/reports", () => {
    it("should successfully create a scam report for a new number and notify watchlists", async () => {
      const payload = {
        number: "+85512345678", // Valid Cambodian number
        category: "BANK_FRAUD",
        description: "Impersonated bank officer asking for OTP.",
        province: "Phnom Penh",
      };

      // Mock database calls
      prismaMock.phoneNumber.findUnique
        .mockResolvedValueOnce(null as any) // call #1: report controller – number doesn't exist yet
        .mockResolvedValueOnce(null as any) // call #2: recalculatePhoneNumberRisk – early return (no reports needed)
        .mockResolvedValueOnce({ id: "mock-phone-id", number: payload.number, totalReport: 1, riskScore: 75 } as any); // call #3: updatedPhoneNumber

      prismaMock.phoneNumber.create.mockResolvedValue({
        id: "mock-phone-id",
        number: payload.number,
        riskScore: 0,
        totalReport: 0,
      } as any);

      prismaMock.phoneNumber.update.mockResolvedValue({
        id: "mock-phone-id",
        number: payload.number,
        riskScore: 75,
        totalReport: 1,
      } as any);

      prismaMock.reporterProfile.findUnique.mockResolvedValue({
        id: "profile-id",
        userId: "mock-user-id",
      } as any);

      prismaMock.report.create.mockResolvedValue({
        id: "mock-report-id",
        category: payload.category,
        description: payload.description,
        userId: "mock-user-id",
        numberId: "mock-phone-id",
        province: payload.province,
        createdAt: new Date(),
        status: "PENDING",
      } as any);

      // Mock watchlist members to verify notify logic
      prismaMock.watchlist.findMany.mockResolvedValue([
        { id: "watchlist-id", userId: "watcher-user-id", numberId: "mock-phone-id" },
      ] as any);

      prismaMock.notification.create.mockResolvedValue({
        id: "notif-id",
        userId: "watcher-user-id",
      } as any);

      const response = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${mockToken}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Report submitted successfully");
      expect(response.body).toHaveProperty("report");
      expect(response.body.phoneNumber.riskScore).toBe(75);

      expect(prismaMock.phoneNumber.findUnique).toHaveBeenCalled();
      expect(prismaMock.report.create).toHaveBeenCalled();
      expect(prismaMock.watchlist.findMany).toHaveBeenCalledWith({
        where: { numberId: "mock-phone-id" },
      });
      expect(prismaMock.notification.create).toHaveBeenCalled();
    });

    it("should return 401 if access token is missing", async () => {
      const response = await request(app)
        .post("/api/reports")
        .send({ number: "+85512345678", category: "BANK_FRAUD" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Access token is missing");
    });

    it("should return 400 for invalid phone number format", async () => {
      const response = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ number: "123", category: "BANK_FRAUD" }); // Too short/invalid for KH

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid phone number");
    });

    it("should return 400 for invalid scam category", async () => {
      const response = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({ number: "+85512345678", category: "INVALID_SCAM_TYPE" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid category");
    });
  });

  describe("GET /api/reports", () => {
    it("should return recent reports list with masked emails", async () => {
      prismaMock.report.findMany.mockResolvedValue([
        {
          id: "report-1",
          category: "TECH_SUPPORT",
          description: "Scammer caller",
          createdAt: new Date(),
          province: "Siem Reap",
          status: "PENDING",
          phoneNumber: { number: "+85599888777", riskScore: 40, countryCode: "KH" },
          user: { email: "victim@example.com" },
          evidence: [],
        },
      ] as any);

      const response = await request(app).get("/api/reports");

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      // Verify email masking
      expect(response.body[0].reporter).toBe("vi****@example.com");
      expect(response.body[0].number).toBe("+85599888777");
    });
  });
});
