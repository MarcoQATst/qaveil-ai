import { describe, expect, it } from "vitest";
import { qaReviewSchema } from "../../src/schemas/review";
import { analysisResultSchema } from "../../src/schemas/analysis";
import { makeAnalysis } from "../helpers/qa-fixtures";

describe("qaReviewSchema", () => {
  it("accepts the canonical structured judge payload", () => {
    const parsed = qaReviewSchema.parse({
      score: 81,
      overallAssessment: "Solid analysis with a few gaps.",
      strengths: ["Good happy path"],
      issues: [
        {
          id: "ISSUE-001",
          type: "GHERKIN_ERROR",
          severity: "MEDIUM",
          description: "Missing Feature header",
          affectedTestCase: "TC-001",
          recommendedAction: "Add a Feature header.",
        },
      ],
      missingScenarios: ["Unauthorized request"],
      potentiallyInventedRules: [],
      gherkinIssues: ["TC-001"],
      coverageAssessment: "Functional coverage is acceptable.",
      recommendations: ["Fix Gherkin headers."],
    });

    expect(parsed.score).toBe(81);
    expect(parsed.issues[0].type).toBe("GHERKIN_ERROR");
    expect(parsed.missingScenarios).toEqual(["Unauthorized request"]);
  });

  it("accepts the previous issuesFound / missingTestScenarios field names", () => {
    const parsed = qaReviewSchema.parse({
      score: 60,
      overallAssessment: "Legacy payload",
      strengths: [],
      issuesFound: [
        {
          id: "ISSUE-009",
          type: "INVENTED_RULE",
          severity: "HIGH",
          description: "Timeout invented",
          recommendedAction: "Mark as ambiguity.",
        },
      ],
      missingTestScenarios: ["Boundary of token length"],
      potentiallyInventedRules: ["Timeout of 30 seconds"],
      gherkinIssues: [],
      coverageAssessment: "Incomplete",
      recommendations: [],
    });

    expect(parsed.issues).toHaveLength(1);
    expect(parsed.missingScenarios).toEqual(["Boundary of token length"]);
  });

  it("rejects an out-of-range score", () => {
    expect(() =>
      qaReviewSchema.parse({
        score: 140,
        overallAssessment: "Invalid",
        strengths: [],
        issues: [],
        missingScenarios: [],
        potentiallyInventedRules: [],
        gherkinIssues: [],
        coverageAssessment: "n/a",
        recommendations: [],
      }),
    ).toThrow();
  });

  it("requires a measurable coverage summary in an analysis", () => {
    const { coverageSummary: _coverageSummary, ...analysisWithoutSummary } = makeAnalysis();
    expect(() => analysisResultSchema.parse(analysisWithoutSummary)).toThrow();
  });
});
