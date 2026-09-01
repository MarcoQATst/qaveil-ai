import { describe, expect, it } from "vitest";
import { analyzeWithReview } from "../../src/application/qa-pipeline";
import { DeterministicAIProvider } from "../../src/infrastructure/ai/deterministic-provider";
import { DeterministicQAJudge } from "../../src/infrastructure/ai/deterministic-judge";
import { sampleInput } from "../helpers/qa-fixtures";

describe("project context in QA pipeline", () => {
  it("passes confirmed context to analyst and judge without a Gemini request", async () => {
    const projectContext = { projectId: "p1", projectName: "Portal", entries: [], promptContext: "[REGRA CONFIRMADA DO PROJETO]\nBR-001", regressionImpact: { impactedModules: ["Plans"], relatedRules: ["BR-001"], relatedFeatures: [], recommendedRegressionScenarios: [], potentialRequirementConflicts: ["POTENTIAL_REQUIREMENT_CONFLICT: Compare BR-001."] } };
    const response = await analyzeWithReview({ analyst: new DeterministicAIProvider(), judge: new DeterministicQAJudge() }, { ...sampleInput, projectId: "p1", projectContext });
    expect(response.analysis.regressionImpact.relatedRules).toEqual(["BR-001"]);
    expect(response.review?.issues.some((issue) => issue.description.includes("POTENTIAL_REQUIREMENT_CONFLICT"))).toBe(true);
  });
});
