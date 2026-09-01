import type { QAReview } from "../schemas/review";

export const AUTO_CORRECT_POLICY = {
  maxCycles: 2,
  minScoreToSkip: 90,
  blockingSeverities: ["HIGH", "CRITICAL"] as const,
} as const;

export function hasBlockingIssues(review: QAReview): boolean {
  return review.issues.some((issue) =>
    AUTO_CORRECT_POLICY.blockingSeverities.includes(issue.severity as (typeof AUTO_CORRECT_POLICY.blockingSeverities)[number]),
  );
}

/**
 * Run the Auto Corrector when quality is below the skip threshold, or when any
 * HIGH/CRITICAL issue remains. Easy to change: edit AUTO_CORRECT_POLICY.
 */
export function shouldAutoCorrect(review: QAReview): boolean {
  if (hasBlockingIssues(review)) return true;
  if (review.score >= AUTO_CORRECT_POLICY.minScoreToSkip) return false;
  return (
    review.issues.length > 0 ||
    review.missingScenarios.length > 0 ||
    review.potentiallyInventedRules.length > 0 ||
    review.gherkinIssues.length > 0
  );
}
