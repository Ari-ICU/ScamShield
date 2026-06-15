export interface RiskFactors {
  totalReports: number;
  countryCode?: string;
  uniqueUsers: number;
  recentReports: number;
}

/**
 * Calculates the risk score (0-100) for a given phone number based on its reporting history.
 */
export function calculateRiskScore(factors: RiskFactors): number {
  let score = 0;

  // 1. Increment based on total reports
  score += factors.totalReports * 5;

  // 2. Increment if it's an international/non-Cambodian number (+855 is Cambodian)
  const isInternational = factors.countryCode
    ? factors.countryCode.toUpperCase() !== "KH" && factors.countryCode !== "855"
    : false;

  if (isInternational) {
    score += 15;
  }

  // 3. Increment if reported by multiple distinct users
  if (factors.uniqueUsers >= 3) {
    score += 30;
  }

  // 4. Increment if there's high reporting velocity (recent reports > 10)
  if (factors.recentReports > 10) {
    score += 20;
  }

  return Math.min(score, 100);
}
