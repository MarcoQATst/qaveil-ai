import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiAIProvider } from "../../src/infrastructure/ai/gemini-provider";

describe("GeminiAIProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws an error if GEMINI_API_KEY is not defined", () => {
    expect(() => new GeminiAIProvider("")).toThrow("GEMINI_API_KEY environment variable is not defined.");
  });

  it("successfully calls Gemini API and returns the parsed result", async () => {
    const mockAnalysisResult = {
      completeness: {
        status: "GOOD",
        score: 88,
        rationale: "Clear reset password requirement with explicit validation rule."
      },
      summary: "The requirement resets user password.",
      requirementFacts: ["Only registered emails can request recovery."],
      inferredRisks: ["QA Inference: Expired tokens could be reused if not invalidated."],
      requirementGaps: ["Requirement gap: Token expiry duration not defined.", "Requirement gap: Rate limiting for reset requests not specified."],
      contradictions: [],
      qaImpact: {
        criticalAreas: ["Email delivery", "Token security"],
        recommendedTesting: ["Functional", "Security", "Integration"],
        regressionAreas: ["Authentication flow", "Email service"],
        blockers: []
      },
      actors: ["customer"],
      businessRules: ["Only registered emails can request recovery."],
      dependencies: ["Email service"],
      preconditions: ["User has access to their inbox"],
      postconditions: ["Reset token is generated and emailed"],
      ambiguities: [],
      missingInformation: ["Token expiry duration.", "Rate limiting rules."],
      questionsForPo: ["How long should the reset token be valid?"],
      risk: {
        impact: { score: 4, rationale: "Failure blocks user account recovery." },
        probability: { score: 3, rationale: "Email delivery failures are not uncommon." },
        complexity: { score: 3, rationale: "Involves email service integration and token lifecycle." },
        detectability: { score: 3, rationale: "Token reuse failures may not surface immediately." },
        rationale: "Authentication flows have critical security implications.",
        factors: ["security", "email delivery"]
      },
      hiddenRisks: [
        {
          risk: "Token reuse",
          whyItMatters: "Expired or used tokens could be hijacked.",
          suggestedTest: "Attempt resetting password twice with the same token.",
          priority: "CRITICAL"
        }
      ],
      scenarios: [
        {
          id: "SC-001",
          title: "Successful password reset request",
          type: "Functional",
          category: "POSITIVE",
          description: "Request with registered email.",
          prerequisites: ["User has a registered account", "User has access to their email inbox"],
          testData: "Email: registered@example.com",
          steps: ["Navigate to reset page", "Submit valid email"],
          gherkin: "Scenario: Successful password reset\n  Given the user is on the reset page\n  When they submit a valid email\n  Then a reset email should be sent",
          priority: "HIGH",
          expectedBehavior: "Recovery email sent.",
          automation: "AUTOMATION_HIGHLY_RECOMMENDED"
        }
      ],
      edgeCases: [
        {
          value: "unregistered@example.com",
          category: "INVALID_INPUT",
          reason: "Should reject gracefully without leaking email existence if possible, or show standard message."
        }
      ],
      gherkin: [
        {
          title: "Request recovery",
          category: "HAPPY_PATH",
          content: "Feature: Password Reset\n\nScenario: Request reset link\n  Given client is on reset page\n  When submitting a valid email\n  Then email is dispatched"
        }
      ],
      coverage: {
        functional: 90,
        negative: 80,
        boundary: 70,
        security: 95,
        integration: 60,
        regression: 50,
        lowCoverageAreas: []
      },
      coverageSummary: {
        totalTestCases: 1,
        happyPathCases: 1,
        negativeCases: 0,
        edgeCases: 0,
        validationCases: 0,
        integrationCases: 0,
        authorizationCases: 0,
        uncoveredAreas: []
      }
    };

    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify(mockAnalysisResult)
              }
            ]
          }
        }
      ]
    };

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
      text: async () => JSON.stringify(mockApiResponse),
    } as Response);

    const provider = new GeminiAIProvider("test-api-key");
    const result = await provider.analyzeRequirement({
      locale: "en",
      userStory: "As a customer, I want to reset my password.",
      requirement: "The system sends a recovery email when a customer requests a password reset.",
      acceptanceCriteria: "Only registered emails can request recovery.",
      additionalContext: "",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    
    // Verify that the request went to the correct URL with key
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("generativelanguage.googleapis.com");
    expect(calledUrl).toContain("gemini-3.6-flash");
    expect(calledUrl).toContain("key=test-api-key");

    // Verify the mock return values
    expect(result.summary).toBe("The requirement resets user password.");
    expect(result.actors).toContain("customer");
    // Risk score is auto-calculated: 4+3+3+3=13 → HIGH
    expect(result.risk.score).toBe(13);
    expect(result.risk.level).toBe("HIGH");
    expect(result.risk.impact.score).toBe(4);
    expect(result.risk.detectability.score).toBe(3);
    expect(result.hiddenRisks[0].risk).toBe("Token reuse");
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.systemInstruction.parts[0].text).toContain("COVERAGE-FIRST TEST DESIGN");
    expect(requestBody.systemInstruction.parts[0].text).toContain("NO fixed minimum or maximum");
    expect(result.coverageSummary.totalTestCases).toBe(result.scenarios.length);
  });

  it("throws an error when Gemini API response is not ok", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "API key expired",
    } as Response);

    const provider = new GeminiAIProvider("invalid-key");
    await expect(
      provider.analyzeRequirement({
        locale: "en",
        requirement: "Some req",
      })
    ).rejects.toThrowError("Gemini API error: Request failed with status 400.");
  });
});
