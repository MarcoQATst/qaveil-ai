import { describe, expect, it } from "vitest";
import { AUTO_CORRECT_POLICY, shouldAutoCorrect } from "../../src/application/auto-correct-policy";
import { makeIssue, makeReview } from "../helpers/qa-fixtures";

describe("shouldAutoCorrect", () => {
  it("skips when score is at least 90 and there are no HIGH or CRITICAL issues", () => {
    const review = makeReview({
      score: 91,
      issues: [makeIssue({ id: "ISSUE-LOW", type: "MISSING_TEST_DATA", severity: "LOW" })],
    });
    expect(shouldAutoCorrect(review)).toBe(false);
    expect(AUTO_CORRECT_POLICY.minScoreToSkip).toBe(90);
    expect(AUTO_CORRECT_POLICY.maxCycles).toBe(2);
  });

  it("runs when a HIGH or CRITICAL issue exists even if score is high", () => {
    const review = makeReview({
      score: 95,
      issues: [makeIssue({ type: "INVENTED_RULE", severity: "CRITICAL" })],
    });
    expect(shouldAutoCorrect(review)).toBe(true);
  });

  it("runs when score is below the threshold", () => {
    const review = makeReview({ score: 72 });
    expect(shouldAutoCorrect(review)).toBe(true);
  });
});
