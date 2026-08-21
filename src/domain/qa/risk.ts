export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskFactors = {
  impact: number;
  probability: number;
  complexity: number;
  detectability: number;
};

export function calculateRiskScore(factors: RiskFactors): number {
  return factors.impact + factors.probability + factors.complexity + factors.detectability;
}

export function classifyRisk(score: number): RiskLevel {
  if (score >= 16) return "CRITICAL";
  if (score >= 11) return "HIGH";
  if (score >= 6) return "MEDIUM";
  return "LOW";
}
