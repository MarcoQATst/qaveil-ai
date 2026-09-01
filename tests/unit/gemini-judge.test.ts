import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiQAJudge } from "../../src/infrastructure/ai/gemini-judge";
import { GeminiQACorrector } from "../../src/infrastructure/ai/gemini-corrector";
import { makeAnalysis, sampleInput } from "../helpers/qa-fixtures";

const validReview = {
  score: 64,
  overallAssessment: "Coverage is incomplete.",
  strengths: ["Facts are separated from inferences."],
  issues: [
    {
      id: "ISSUE-001",
      type: "MISSING_SCENARIO",
      severity: "HIGH",
      description: "No negative scenario",
      recommendedAction: "Add a negative scenario from the requirement.",
    },
  ],
  missingScenarios: ["Unregistered email"],
  potentiallyInventedRules: [],
  gherkinIssues: [],
  coverageAssessment: "Negative coverage is weak.",
  recommendations: ["Add negative coverage."],
};

describe("GeminiQAJudge", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when the API key is missing", () => {
    expect(() => new GeminiQAJudge("")).toThrow("GEMINI_API_KEY environment variable is not defined.");
  });

  it("parses a structured review from Gemini", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(validReview) }] } }],
      }),
    } as Response);

    const review = await new GeminiQAJudge("test-api-key").reviewAnalysis(sampleInput, makeAnalysis());
    expect(review.score).toBe(64);
    expect(review.issues[0].type).toBe("MISSING_SCENARIO");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("key=test-api-key");
  });

  it("throws when the Judge API fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(new GeminiQAJudge("test-api-key").reviewAnalysis(sampleInput, makeAnalysis())).rejects.toThrow(
      "Gemini Judge API error: Request failed with status 500.",
    );
  });
});

describe("GeminiQACorrector", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a corrected analysis and changelog", async () => {
    const analysis = makeAnalysis({ summary: "Corrected without invented rules" });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                analysis,
                changelog: [{
                  issueId: "ISSUE-001",
                  type: "MISSING_SCENARIO",
                  action: "FIXED",
                  summary: "Added gap-based negative scenario.",
                }],
              }),
            }],
          },
        }],
      }),
    } as Response);

    const result = await new GeminiQACorrector("test-api-key").correctAnalysis({
      input: sampleInput,
      originalAnalysis: makeAnalysis(),
      review: validReview as never,
    });
    expect(result.analysis.summary).toBe("Corrected without invented rules");
    expect(result.changelog[0].action).toBe("FIXED");
  });

  it("throws when the Corrector API fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    await expect(
      new GeminiQACorrector("test-api-key").correctAnalysis({
        input: sampleInput,
        originalAnalysis: makeAnalysis(),
        review: validReview as never,
      }),
    ).rejects.toThrow("Gemini Corrector API error: Rate limit exceeded (Status 429).");
  });
});
