export function calculateReputationScore(approvedReports: number, rejectedReports: number): number {
  const score = (approvedReports * 8.5) - (rejectedReports * 15);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getVerificationLevel(score: number, role?: string): "NEW_USER" | "TRUSTED" | "VERIFIED" | "MODERATOR" {
  if (role === "ADMIN") {
    return "MODERATOR";
  }
  if (score >= 80) {
    return "VERIFIED";
  }
  if (score >= 30) {
    return "TRUSTED";
  }
  return "NEW_USER";
}
