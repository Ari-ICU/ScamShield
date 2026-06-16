import { describe, expect, it } from "@jest/globals";
import { calculateRiskScore, calculateDetailedRiskScore } from "../services/riskEngine.js";

describe("Risk Engine Calculations", () => {
  describe("calculateRiskScore (Legacy)", () => {
    it("should calculate correct risk score based on simple factors", () => {
      const score = calculateRiskScore({
        totalReports: 2,
        countryCode: "KH",
        uniqueUsers: 1,
        recentReports: 1,
      });
      // 2 reports * 5 = 10. uniqueUsers < 3 -> +0. recentReports <= 10 -> +0. KH -> +0. Total = 10
      expect(score).toBe(10);
    });

    it("should add penalty for international country codes", () => {
      const score = calculateRiskScore({
        totalReports: 1,
        countryCode: "US",
        uniqueUsers: 1,
        recentReports: 1,
      });
      // 1 report * 5 = 5. US (intl) -> +15. Total = 20
      expect(score).toBe(20);
    });

    it("should add penalty for multiple unique users and high velocity", () => {
      const score = calculateRiskScore({
        totalReports: 4,
        countryCode: "KH",
        uniqueUsers: 3,
        recentReports: 11,
      });
      // 4 reports * 5 = 20. uniqueUsers >= 3 -> +30. recentReports > 10 -> +20. Total = 70
      expect(score).toBe(70);
    });

    it("should cap the risk score at 100", () => {
      const score = calculateRiskScore({
        totalReports: 30,
        countryCode: "US",
        uniqueUsers: 10,
        recentReports: 20,
      });
      expect(score).toBe(100);
    });
  });

  describe("calculateDetailedRiskScore (Advanced)", () => {
    const freshDate = new Date();

    it("should return 0 when no reports are provided", () => {
      const score = calculateDetailedRiskScore({ reports: [] });
      expect(score).toBe(0);
    });

    it("should ignore reports marked as FALSE_REPORT, INSUFFICIENT_EVIDENCE, or REJECTED", () => {
      const score = calculateDetailedRiskScore({
        reports: [
          {
            createdAt: freshDate,
            status: "FALSE_REPORT",
            evidenceCount: 0,
            reporterRole: "USER",
            reporterScore: 0,
            category: "INVESTMENT",
          },
          {
            createdAt: freshDate,
            status: "INSUFFICIENT_EVIDENCE",
            evidenceCount: 3,
            reporterRole: "ADMIN",
            reporterScore: 100,
            category: "LOTTERY",
          },
        ],
      });
      expect(score).toBe(0);
    });

    it("should calculate correct risk score for a single fresh pending report from a new user", () => {
      const score = calculateDetailedRiskScore({
        reports: [
          {
            createdAt: freshDate,
            status: "PENDING",
            evidenceCount: 0,
            reporterRole: "USER",
            reporterScore: 0,
            reporterVerificationLevel: "NEW_USER",
            category: "BANK_FRAUD",
          },
        ],
        countryCode: "KH",
      });
      // Base score: 15
      // Evidence: 0 (no bonus)
      // Reporter weight: NEW_USER -> 1.0
      // Confidence: PENDING -> 0.5
      // Time decay: fresh -> 1.0
      // Expected = 15 * 1.0 * 0.5 * 1.0 = 7.5 points. KH -> +0, no consistency. Rounded: 8
      expect(score).toBe(8);
    });

    it("should apply evidence bonuses", () => {
      const score = calculateDetailedRiskScore({
        reports: [
          {
            createdAt: freshDate,
            status: "CONFIRMED_SCAM",
            evidenceCount: 2, // 2 * 5 = +10 points
            reporterRole: "USER",
            reporterScore: 10,
            reporterVerificationLevel: "NEW_USER",
            category: "BANK_FRAUD",
          },
        ],
        countryCode: "KH",
      });
      // Base: 15 + 10 (evidence) = 25
      // Reporter weight: 1.0
      // Confidence: CONFIRMED_SCAM -> 1.0
      // Expected = 25. KH -> +0, no consistency. Total: 25
      expect(score).toBe(25);
    });

    it("should respect reporter roles and verification levels", () => {
      const score = calculateDetailedRiskScore({
        reports: [
          {
            createdAt: freshDate,
            status: "CONFIRMED_SCAM",
            evidenceCount: 0,
            reporterRole: "ADMIN", // Weight 5.0
            reporterScore: 0,
            reporterVerificationLevel: "MODERATOR",
            category: "BANK_FRAUD",
          },
        ],
      });
      // Base: 15
      // Weight: 5.0
      // Confidence: CONFIRMED_SCAM -> 1.0
      // Expected = 15 * 5.0 = 75.
      expect(score).toBe(75);
    });

    it("should apply time decay factors correctly", () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10); // Decay: 0.75x

      const fortyDaysAgo = new Date();
      fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40); // Decay: 0.5x

      const hundredDaysAgo = new Date();
      hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100); // Decay: 0.1x

      const score1 = calculateDetailedRiskScore({
        reports: [
          {
            createdAt: tenDaysAgo,
            status: "CONFIRMED_SCAM",
            evidenceCount: 0,
            reporterRole: "USER",
            reporterScore: 0,
            reporterVerificationLevel: "NEW_USER",
            category: "BANK_FRAUD",
          },
        ],
      });
      // 15 * 1.0 * 1.0 * 0.75 = 11.25 -> 11
      expect(score1).toBe(11);

      const score2 = calculateDetailedRiskScore({
        reports: [
          {
            createdAt: fortyDaysAgo,
            status: "CONFIRMED_SCAM",
            evidenceCount: 0,
            reporterRole: "USER",
            reporterScore: 0,
            reporterVerificationLevel: "NEW_USER",
            category: "BANK_FRAUD",
          },
        ],
      });
      // 15 * 1.0 * 1.0 * 0.5 = 7.5 -> 8
      expect(score2).toBe(8);

      const score3 = calculateDetailedRiskScore({
        reports: [
          {
            createdAt: hundredDaysAgo,
            status: "CONFIRMED_SCAM",
            evidenceCount: 0,
            reporterRole: "USER",
            reporterScore: 0,
            reporterVerificationLevel: "NEW_USER",
            category: "BANK_FRAUD",
          },
        ],
      });
      // 15 * 1.0 * 1.0 * 0.1 = 1.5 -> 2
      expect(score3).toBe(2);
    });

    it("should apply international bonus and report consistency bonus", () => {
      const score = calculateDetailedRiskScore({
        reports: [
          {
            createdAt: freshDate,
            status: "CONFIRMED_SCAM",
            evidenceCount: 0,
            reporterRole: "USER",
            reporterScore: 0,
            reporterVerificationLevel: "NEW_USER",
            category: "BANK_FRAUD",
          },
          {
            createdAt: freshDate,
            status: "CONFIRMED_SCAM",
            evidenceCount: 0,
            reporterRole: "USER",
            reporterScore: 0,
            reporterVerificationLevel: "NEW_USER",
            category: "BANK_FRAUD",
          },
        ],
        countryCode: "US", // International -> +15
      });
      // Report 1: 15
      // Report 2: 15
      // Sum = 30
      // International: +15
      // Consistency: 2/2 same category (BANK_FRAUD) >= 60% -> +15
      // Expected = 30 + 15 + 15 = 60
      expect(score).toBe(60);
    });
  });
});
