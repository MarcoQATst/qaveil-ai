import { describe, expect, it } from "vitest";
import { autoCorrectAnalysis, runAnalysisPipeline } from "../../src/application/qa-pipeline";
import type { AIProvider } from "../../src/domain/ai/provider";
import type { CorrectorProvider } from "../../src/domain/ai/corrector-provider";
import type { JudgeProvider } from "../../src/domain/ai/judge-provider";
import type { RequirementAnalysis } from "../../src/schemas/analysis";
import type { QAReview } from "../../src/schemas/review";
import { makeAnalysis, makeIssue, makeReview, sampleInput } from "../helpers/qa-fixtures";

class SequenceJudge implements JudgeProvider {
  readonly name = "fake-judge";
  reviews: QAReview[];
  calls = 0;
  failAt: number | null;

  constructor(reviews: QAReview[], failAt: number | null = null) {
    this.reviews = reviews;
    this.failAt = failAt;
  }

  async reviewAnalysis(): Promise<QAReview> {
    this.calls += 1;
    if (this.failAt === this.calls) {
      throw new Error("Judge failed");
    }
    return this.reviews[Math.min(this.calls - 1, this.reviews.length - 1)];
  }
}

class CountingCorrector implements CorrectorProvider {
  readonly name = "fake-corrector";
  calls = 0;
  fail = false;
  lastAnalysis: RequirementAnalysis | null = null;

  constructor(private readonly patched: RequirementAnalysis = makeAnalysis({
    summary: "Corrected analysis",
    scenarios: [
      ...makeAnalysis().scenarios,
      {
        id: "TC-GAP-001",
        title: "Negative recovery",
        type: "Functional",
        category: "NEGATIVE",
        description: "Unregistered email",
        prerequisites: ["Requirement gap: exact error message is not specified."],
        testData: "Requirement gap: concrete invalid email not specified.",
        steps: ["Submit an unregistered email"],
        gherkin: "Feature: Recovery\n\nScenario: Unregistered email\n  Given a visitor\n  When they request recovery\n  Then the system must not invent an error message",
        priority: "HIGH",
        expectedBehavior: "Requirement gap: expected error text is not in the original requirement.",
        automation: "MANUAL",
      },
    ],
  })) {}

  async correctAnalysis() {
    this.calls += 1;
    if (this.fail) throw new Error("Corrector failed");
    this.lastAnalysis = this.patched;
    return {
      analysis: this.patched,
      changelog: [
        {
          issueId: "ISSUE-001",
          type: "MISSING_SCENARIO" as const,
          action: "FIXED" as const,
          summary: "Added a negative scenario without inventing rules.",
        },
      ],
    };
  }
}

class FakeAnalyst implements AIProvider {
  readonly name = "fake-analyst";
  constructor(private readonly analysis = makeAnalysis()) {}
  async analyzeRequirement() {
    return this.analysis;
  }
}

describe("QA pipeline", () => {
  it("identifies judge issues on the original analysis", async () => {
    const judge = new SequenceJudge([makeReview()]);
    const result = await runAnalysisPipeline(
      { analyst: new FakeAnalyst(), judge, corrector: new CountingCorrector() },
      sampleInput,
    );
    expect(result.review?.issues[0].type).toBe("MISSING_SCENARIO");
    expect(result.correction).toBeUndefined();
  });

  it("corrects a missing scenario and asks the judge for a final independent score", async () => {
    const initial = makeReview({ score: 72 });
    const final = makeReview({
      score: 94,
      issues: [],
      missingScenarios: [],
      overallAssessment: "Coverage improved.",
    });
    const judge = new SequenceJudge([final]);
    const corrector = new CountingCorrector();
    const result = await autoCorrectAnalysis(
      { analyst: new FakeAnalyst(), judge, corrector },
      sampleInput,
      makeAnalysis(),
      initial,
    );

    expect(corrector.calls).toBe(1);
    expect(judge.calls).toBe(1);
    expect(result.initialReview?.score).toBe(72);
    expect(result.finalReview?.score).toBe(94);
    expect(result.analysis.scenarios.some((scenario) => scenario.id === "TC-GAP-001")).toBe(true);
    expect(result.correction?.trace[0].status).toBe("CORRECTED");
  });

  it("does not invent a higher score locally — the final score comes from the second judge", async () => {
    const judge = new SequenceJudge([
      makeReview({ score: 61, issues: [] }),
    ]);
    const result = await autoCorrectAnalysis(
      { analyst: new FakeAnalyst(), judge, corrector: new CountingCorrector() },
      sampleInput,
      makeAnalysis(),
      makeReview({ score: 40 }),
    );
    expect(result.finalReview?.score).toBe(61);
    expect(result.finalReview?.score).not.toBe(40 + 10);
  });

  it("stops after two correction cycles", async () => {
    const stubborn = makeReview({
      score: 50,
      issues: [makeIssue({ type: "MISSING_SCENARIO", severity: "HIGH" })],
    });
    const judge = new SequenceJudge([stubborn, stubborn]);
    const corrector = new CountingCorrector();
    const result = await autoCorrectAnalysis(
      { analyst: new FakeAnalyst(), judge, corrector },
      sampleInput,
      makeAnalysis(),
      stubborn,
    );
    expect(corrector.calls).toBe(2);
    expect(judge.calls).toBe(2);
    expect(result.correction?.cycles).toBe(2);
  });

  it("does not call the corrector when score is >= 90 without HIGH/CRITICAL issues", async () => {
    const review = makeReview({
      score: 91,
      issues: [makeIssue({ type: "MISSING_TEST_DATA", severity: "LOW" })],
    });
    const corrector = new CountingCorrector();
    const judge = new SequenceJudge([review]);
    const result = await autoCorrectAnalysis(
      { analyst: new FakeAnalyst(), judge, corrector },
      sampleInput,
      makeAnalysis(),
      review,
    );
    expect(corrector.calls).toBe(0);
    expect(judge.calls).toBe(0);
    expect(result.correction?.skipped).toBe(true);
    expect(result.analysis.summary).toBe(makeAnalysis().summary);
  });

  it("surfaces a corrector error", async () => {
    const corrector = new CountingCorrector();
    corrector.fail = true;
    await expect(
      autoCorrectAnalysis(
        { analyst: new FakeAnalyst(), judge: new SequenceJudge([makeReview()]), corrector },
        sampleInput,
        makeAnalysis(),
        makeReview(),
      ),
    ).rejects.toThrow("Corrector failed");
  });

  it("surfaces a judge error", async () => {
    await expect(
      runAnalysisPipeline(
        {
          analyst: new FakeAnalyst(),
          judge: new SequenceJudge([makeReview()], 1),
          corrector: new CountingCorrector(),
        },
        sampleInput,
      ),
    ).rejects.toThrow("Judge failed");
  });

  it("runs Analyst → Judge → Corrector → Judge", async () => {
    const initial = makeReview({ score: 70 });
    const final = makeReview({ score: 93, issues: [], missingScenarios: [] });
    const judge = new SequenceJudge([initial, final]);
    const corrector = new CountingCorrector();
    const result = await runAnalysisPipeline(
      { analyst: new FakeAnalyst(), judge, corrector },
      sampleInput,
      { autoCorrect: true },
    );
    expect(judge.calls).toBe(2);
    expect(corrector.calls).toBe(1);
    expect(result.initialReview?.score).toBe(70);
    expect(result.finalReview?.score).toBe(93);
    expect(result.originalAnalysis?.summary).toBe(makeAnalysis().summary);
    expect(result.analysis.summary).toBe("Corrected analysis");
  });
});
