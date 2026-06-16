import { describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import app from "../app.js";
import { prismaMock } from "./setup.js";
import { generateAccessToken } from "../utils/auth.js";

describe("Appeals Endpoints", () => {
  const adminToken = generateAccessToken({
    id: "admin-id",
    email: "admin@scamshield.gov.kh",
    role: "ADMIN",
  });

  const userToken = generateAccessToken({
    id: "user-id",
    email: "user@example.com",
    role: "USER",
  });

  describe("POST /api/appeals", () => {
    it("should successfully submit an appeal for a flagged number", async () => {
      const payload = {
        number: "+85512345678",
        reason: "This number belongs to my business and was falsely reported by competitors.",
        contactEmail: "business@owner.com",
      };

      prismaMock.phoneNumber.findUnique.mockResolvedValue({
        id: "phone-id",
        number: payload.number,
      } as any);

      prismaMock.appeal.create.mockResolvedValue({
        id: "appeal-id",
        numberId: "phone-id",
        reason: payload.reason,
        contactEmail: payload.contactEmail,
        status: "PENDING",
        createdAt: new Date(),
      } as any);

      const response = await request(app)
        .post("/api/appeals")
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Appeal submitted successfully");
      expect(response.body.appeal).toHaveProperty("id");
      expect(prismaMock.phoneNumber.findUnique).toHaveBeenCalledWith({
        where: { number: "+85512345678" },
      });
      expect(prismaMock.appeal.create).toHaveBeenCalled();
    });

    it("should return 404 if the number does not exist in registry", async () => {
      prismaMock.phoneNumber.findUnique.mockResolvedValue(null as any);

      const response = await request(app)
        .post("/api/appeals")
        .send({
          number: "+85500000000",
          reason: "Falsely reported line.",
          contactEmail: "test@example.com",
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Phone number not found in registry");
    });

    it("should return 400 for validation errors", async () => {
      const response = await request(app)
        .post("/api/appeals")
        .send({
          number: "+85512345678",
          reason: "Short", // Less than 10 chars
          contactEmail: "invalid-email",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /api/admin/appeals/:id", () => {
    it("should allow admin to approve an appeal and reset risk score to 0", async () => {
      const appealId = "appeal-id";

      prismaMock.appeal.findUnique.mockResolvedValue({
        id: appealId,
        numberId: "phone-id",
        contactEmail: "business@owner.com",
        status: "PENDING",
        phoneNumber: {
          id: "phone-id",
          number: "+85512345678",
        },
      } as any);

      prismaMock.appeal.update.mockResolvedValue({
        id: appealId,
        status: "APPROVED",
        resolvedAt: new Date(),
      } as any);

      prismaMock.report.updateMany.mockResolvedValue({ count: 5 } as any);
      prismaMock.phoneNumber.update.mockResolvedValue({
        id: "phone-id",
        riskScore: 0,
        totalReport: 0,
      } as any);

      prismaMock.user.findUnique.mockResolvedValue({
        id: "registered-user-id",
        email: "business@owner.com",
      } as any);

      prismaMock.notification.create.mockResolvedValue({ id: "notif-id" } as any);
      prismaMock.auditLog.create.mockResolvedValue({ id: "audit-id" } as any);

      const response = await request(app)
        .patch(`/api/admin/appeals/${appealId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "APPROVED" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Appeal resolved successfully as APPROVED");
      expect(prismaMock.report.updateMany).toHaveBeenCalledWith({
        where: { numberId: "phone-id" },
        data: { status: "FALSE_REPORT" },
      });
      expect(prismaMock.phoneNumber.update).toHaveBeenCalledWith({
        where: { id: "phone-id" },
        data: { riskScore: 0, totalReport: 0 },
      });
      expect(prismaMock.notification.create).toHaveBeenCalled();
    });

    it("should return 403 if user is not an admin", async () => {
      const response = await request(app)
        .patch("/api/admin/appeals/appeal-id")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ status: "APPROVED" });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Forbidden: Admin access required");
    });
  });
});
