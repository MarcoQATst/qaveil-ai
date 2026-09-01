import { describe, expect, it } from "vitest";
import { DeterministicQACorrector } from "../../src/infrastructure/ai/deterministic-corrector";
import { DeterministicQAJudge } from "../../src/infrastructure/ai/deterministic-judge";
import { makeAnalysis, makeIssue, makeReview, sampleInput } from "../helpers/qa-fixtures";

describe("DeterministicQACorrector", () => {
  it("fixes a gherkin error while preserving valid requirement facts", async () => {
    const analysis = makeAnalysis();
    const review = makeReview({
      issues: [makeIssue({ id: "ISSUE-G", type: "GHERKIN_ERROR", affectedTestCase: "TC-001", severity: "MEDIUM" })],
    });
    const result = await new DeterministicQACorrector().correctAnalysis({
      input: sampleInput,
      originalAnalysis: analysis,
      review,
    });
    expect(result.analysis.requirementFacts).toEqual(analysis.requirementFacts);
    expect(result.analysis.scenarios[0].gherkin.startsWith("Feature:")).toBe(true);
    expect(result.changelog[0].action).toBe("FIXED");
  });

  it("does not promote invented rules to facts", async () => {
    const invented = "Tokens expire after exactly 17 minutes.";
    const analysis = makeAnalysis({
      businessRules: ["Only registered emails can request recovery.", invented],
    });
    const review = makeReview({
      potentiallyInventedRules: [invented],
      issues: [makeIssue({ id: "ISSUE-R", type: "INVENTED_RULE", description: `Business rule not found: ${invented}` })],
    });
    const result = await new DeterministicQACorrector().correctAnalysis({
      input: sampleInput,
      originalAnalysis: analysis,
      review,
    });
    expect(result.analysis.businessRules).not.toContain(invented);
    expect(result.analysis.requirementFacts).toEqual(analysis.requirementFacts);
    expect(result.analysis.ambiguities.some((item) => item.term.includes("17 minutes"))).toBe(true);
    expect(result.changelog[0].action).toBe("MARKED_AS_AMBIGUITY");
  });
});

describe("DeterministicQAJudge", () => {
  it("returns a valid structured review and flags missing negative coverage", async () => {
    const review = await new DeterministicQAJudge().reviewAnalysis(sampleInput, makeAnalysis());
    expect(review.score).toBeGreaterThanOrEqual(0);
    expect(review.score).toBeLessThanOrEqual(100);
    expect(review.issues.some((issue) => issue.type === "MISSING_SCENARIO" || issue.type === "GHERKIN_ERROR")).toBe(true);
    expect(Array.isArray(review.recommendations)).toBe(true);
  });

  it("flags uncovered explicit behavior instead of applying a fixed scenario-count rule", async () => {
    const analysis = makeAnalysis({
      requirementFacts: ["The system creates an immutable audit record after the recovery request."],
      businessRules: ["The system creates an immutable audit record after the recovery request."],
      coverageSummary: {
        ...makeAnalysis().coverageSummary,
        totalTestCases: 1,
        uncoveredAreas: [],
      },
    });
    const review = await new DeterministicQAJudge().reviewAnalysis(sampleInput, analysis);

    expect(review.issues.some((issue) => issue.type === "INSUFFICIENT_COVERAGE" && issue.description.includes("immutable audit"))).toBe(true);
    expect(review.missingScenarios).toContain("The system creates an immutable audit record after the recovery request.");
  });

  it("recalculates coverage summary when correcting coverage", async () => {
    const analysis = makeAnalysis({
      coverageSummary: { ...makeAnalysis().coverageSummary, totalTestCases: 99 },
    });
    const review = makeReview({
      issues: [makeIssue({ id: "ISSUE-COVERAGE", type: "INSUFFICIENT_COVERAGE" })],
    });
    const result = await new DeterministicQACorrector().correctAnalysis({
      input: sampleInput,
      originalAnalysis: analysis,
      review,
    });

    expect(result.analysis.coverageSummary.totalTestCases).toBe(result.analysis.scenarios.length);
  });
});
