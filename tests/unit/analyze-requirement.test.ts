import { describe, expect, it } from "vitest";
import { analyzeRequirement } from "../../src/application/analyze-requirement";
import { DeterministicAIProvider } from "../../src/infrastructure/ai/deterministic-provider";

describe("requirement analysis", () => {
  it("returns a structured, QA-oriented analysis", async () => {
    const result = await analyzeRequirement(new DeterministicAIProvider(), {
      locale: "en",
      userStory: "As a customer, I want to reset my password.",
      requirement: "The system sends a recovery email when a registered customer requests a password reset.",
      acceptanceCriteria: "Only registered emails can request recovery.",
      additionalContext: "",
    });

    expect(result.actors).toContain("customer");
    expect(result.questionsForPo.length).toBeGreaterThan(0);
    expect(result.risk.level).toBe("CRITICAL");
    expect(result.hiddenRisks.length).toBeGreaterThan(0);
    expect(result.scenarios.some((scenario) => scenario.category === "SECURITY")).toBe(true);
    expect(result.edgeCases.length).toBeGreaterThan(0);
    expect(result.gherkin).toHaveLength(3);
    expect(result.coverage.functional).toBeGreaterThan(0);
    expect(result.missingInformation).toContain("Authentication, authorization, token expiry, and audit requirements.");
  });
});
