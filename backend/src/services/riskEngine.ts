export interface ReportInput {
  createdAt: Date;
  status: "PENDING" | "UNDER_REVIEW" | "CONFIRMED_SCAM" | "INSUFFICIENT_EVIDENCE" | "FALSE_REPORT";
  evidenceCount: number;
  reporterRole: "USER" | "ADMIN";
  reporterScore: number;
  reporterVerificationLevel?: string;
  category: string;
}

export interface DetailedRiskFactors {
  reports: ReportInput[];
  countryCode?: string;
}

export interface RiskFactors {
  totalReports: number;
  countryCode?: string;
  uniqueUsers: number;
  recentReports: number;
}

/**
 * Calculates the legacy risk score (0-100) for backward compatibility or simple mocks.
 */
export function calculateRiskScore(factors: RiskFactors): number {
  let score = 0;
  score += factors.totalReports * 5;

  const isInternational = factors.countryCode
    ? factors.countryCode.toUpperCase() !== "KH" && factors.countryCode !== "855"
    : false;

  if (isInternational) {
    score += 15;
  }

  if (factors.uniqueUsers >= 3) {
    score += 30;
  }

  if (factors.recentReports > 10) {
    score += 20;
  }

  return Math.min(score, 100);
}

/**
 * Calculates the advanced risk score (0-100) incorporating:
 * + Reporter reputation score
 * + Evidence attached
 * + Moderator approval confidence
 * + Report consistency
 * + Time decay (older reports lose weight)
 */
export function calculateDetailedRiskScore(factors: DetailedRiskFactors): number {
  const { reports, countryCode } = factors;

  if (!reports || reports.length === 0) {
    return 0;
  }

  let totalPoints = 0;
  const now = new Date();
  const categories: Record<string, number> = {};
  const uniqueReporters = new Set<string>();

  for (const report of reports) {
    if (
      report.status === "FALSE_REPORT" ||
      report.status === "INSUFFICIENT_EVIDENCE" ||
      (report.status as any) === "REJECTED"
    ) {
      continue;
    }

    // 1. Base score contribution per report
    let baseScore = 15;

    // 2. Evidence Attached bonus (+5 points per evidence file, up to 15)
    const evidenceBonus = Math.min(report.evidenceCount * 5, 15);
    baseScore += evidenceBonus;

    // 3. Reporter Reputation Weight
    // Trusted Reporter -> 2x, Verified Reporter -> 3x, Moderator -> 5x, New User -> 1x
    let reporterWeight = 1.0;
    if (report.reporterRole === "ADMIN" || report.reporterVerificationLevel === "MODERATOR") {
      reporterWeight = 5.0;
    } else if (report.reporterVerificationLevel === "VERIFIED") {
      reporterWeight = 3.0;
    } else if (report.reporterVerificationLevel === "TRUSTED") {
      reporterWeight = 2.0;
    } else if (report.reporterScore >= 50) {
      // Fallback for backward compatibility
      reporterWeight = 2.0;
    }

    // 4. Moderator Approval Confidence factor
    // CONFIRMED_SCAM reports get 100% weight. PENDING or UNDER_REVIEW get 50% weight.
    let confidenceFactor = 0.0;
    if (report.status === "CONFIRMED_SCAM" || (report.status as any) === "APPROVED") {
      confidenceFactor = 1.0;
    } else if (report.status === "PENDING" || report.status === "UNDER_REVIEW") {
      confidenceFactor = 0.5;
    }

    // 5. Time Decay (older reports lose weight)
    // <= 7 days -> 1.0x, <= 30 days -> 0.75x, <= 90 days -> 0.5x, > 90 days -> 0.1x
    const ageInMs = now.getTime() - new Date(report.createdAt).getTime();
    const ageInDays = Math.max(0, ageInMs / (1000 * 60 * 60 * 24));
    
    let decayFactor = 1.0;
    if (ageInDays > 90) {
      decayFactor = 0.1;
    } else if (ageInDays > 30) {
      decayFactor = 0.5;
    } else if (ageInDays > 7) {
      decayFactor = 0.75;
    }

    // Calculate this report's weighted risk contribution
    const reportContribution = baseScore * reporterWeight * confidenceFactor * decayFactor;
    totalPoints += reportContribution;

    // Track category for consistency analysis
    categories[report.category] = (categories[report.category] || 0) + 1;
  }

  // 6. International number bonus (+15 points)
  const isInternational = countryCode
    ? countryCode.toUpperCase() !== "KH" && countryCode !== "855"
    : false;
  if (isInternational) {
    totalPoints += 15;
  }

  // 7. Report Consistency Bonus
  // If a single scam category dominates reports (>= 60%), add +15 points
  let hasConsistency = false;
  const validReportsCount = reports.filter(
    r => r.status !== "FALSE_REPORT" && r.status !== "INSUFFICIENT_EVIDENCE" && (r.status as any) !== "REJECTED"
  ).length;
  if (validReportsCount > 1) {
    for (const cat in categories) {
      const percentage = categories[cat] / validReportsCount;
      if (percentage >= 0.6) {
        hasConsistency = true;
        break;
      }
    }
  }
  if (hasConsistency) {
    totalPoints += 15;
  }

  // 8. Cap at 100 and round to nearest integer
  return Math.min(Math.max(Math.round(totalPoints), 0), 100);
}
