import { describe, expect, it } from "vitest";
import { calculateRiskScore, classifyRisk } from "../../src/domain/qa/risk";

describe("risk assessment", () => {
  it("calculates the combined score", () => {
    expect(calculateRiskScore({ impact: 5, probability: 4, complexity: 3, detectability: 4 })).toBe(16);
  });

  it.each([
    [0, "LOW"],
    [6, "MEDIUM"],
    [11, "HIGH"],
    [16, "CRITICAL"],
  ] as const)("classifies score %i as %s", (score, level) => {
    expect(classifyRisk(score)).toBe(level);
  });
});
