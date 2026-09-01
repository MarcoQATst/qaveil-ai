import type { CorrectorProvider, CorrectorInput, CorrectorResult } from "../../domain/ai/corrector-provider";
import { analysisResultSchema } from "../../schemas/analysis";
import { changelogEntrySchema } from "../../schemas/correction";
import { GEMINI_JSON_SCHEMA } from "./gemini-provider";

const CORRECTOR_JSON_SCHEMA = {
  type: "object",
  properties: {
    analysis: GEMINI_JSON_SCHEMA,
    changelog: {
      type: "array",
      items: {
        type: "object",
        properties: {
          issueId: { type: "string" },
          type: {
            type: "string",
            enum: [
              "MISSING_SCENARIO",
              "INVALID_SCENARIO",
              "WEAK_EXPECTED_RESULT",
              "MISSING_PRECONDITION",
              "MISSING_TEST_DATA",
              "GHERKIN_ERROR",
              "INVENTED_RULE",
              "CONTRADICTION",
              "INSUFFICIENT_COVERAGE",
              "REDUNDANT_TEST",
            ],
          },
          action: { type: "string", enum: ["FIXED", "RETAINED", "MARKED_AS_AMBIGUITY", "SKIPPED"] },
          summary: { type: "string" },
        },
        required: ["issueId", "type", "action", "summary"],
      },
    },
  },
  required: ["analysis", "changelog"],
};

export class GeminiQACorrector implements CorrectorProvider {
  readonly name = "gemini-corrector";
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string = "gemini-3.6-flash") {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async correctAnalysis({ input, originalAnalysis, review }: CorrectorInput): Promise<CorrectorResult> {
    const isPt = input.locale === "pt";
    const gapPrefix = isPt ? "Lacuna do requisito:" : "Requirement gap:";
    const premisePrefix = isPt ? "Premissa QA (não confirmada no requisito):" : "QA premise (not confirmed in the requirement):";
    const ambiguityPrefix = isPt ? "Ambiguidade:" : "Ambiguity:";

    const systemPrompt = `You are a conservative Senior QA Corrector. You receive an original requirement, a QA analysis, and a structured QA Judge review.
You MUST output JSON conforming strictly to the provided JSON Schema.
All text values in the JSON MUST be written in ${isPt ? "Portuguese" : "English"}. Fix encoding: never emit corrupted characters like "Ã§". Always proper UTF-8.

MISSION: Produce a NEW analysis that PRESERVES what is already correct and ONLY fixes issues identified by the Judge.

HARD RULES:
- The current requirement is primary. Confirmed project rules are complementary context; flag a potential conflict instead of silently deciding.
- NEVER invent business rules, limits, timeouts, error messages, roles, endpoints, or payloads.
- If information is not in the requirement, treat it as ${gapPrefix} / ${premisePrefix} / ${ambiguityPrefix} — never as a fact.
- Do NOT rewrite the whole analysis from scratch.
- Keep existing valid scenarios, facts, risks, and questions unless the Judge flagged them.
- Add scenarios only when the Judge listed missing coverage, and only to the extent supported by the requirement. If the expected result is unknown, say so as a gap.
- When coverage changes, recalculate coverageSummary: totalTestCases must equal scenarios.length; category counts must reflect the final scenarios; uncoveredAreas must retain explicit behaviors blocked by missing information.
- Fix Gherkin syntax/structure without inventing Then outcomes.
- Strengthen weak expected results, preconditions, and test data using requirement facts OR mark them as gaps.
- For potentially invented rules: remove them from businessRules/facts; move them to ambiguities or missingInformation. Use changelog action MARKED_AS_AMBIGUITY.
- Do not delete valid content to "look cleaner".
- changelog MUST include one entry per Judge issue id.

Gherkin: ${isPt ? "Use Portuguese keywords: Funcionalidade, Cenário, Dado, Quando, Então, E." : "Use English keywords: Feature, Scenario, Given, When, Then, And."}`;

    const userPrompt = `ORIGINAL REQUIREMENT:
Locale: ${input.locale}
User Story: ${input.userStory || "Not provided"}
Requirement: ${input.requirement}
Acceptance Criteria: ${input.acceptanceCriteria || "Not provided"}
Additional Context: ${input.additionalContext || "Not provided"}
Relevant Project Context (with provenance): ${input.projectContext?.promptContext || "Not provided"}

ORIGINAL QA ANALYSIS:
${JSON.stringify(originalAnalysis, null, 2)}

QA JUDGE REVIEW (fix only these problems):
${JSON.stringify(review, null, 2)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: CORRECTOR_JSON_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`Gemini Corrector API error: Rate limit exceeded (Status 429).`);
      }
      throw new Error(`Gemini Corrector API error: Request failed with status ${response.status}.`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Invalid response structure from Gemini Corrector API.");
    }

    try {
      const parsed = JSON.parse(text);
      const analysis = analysisResultSchema.parse(parsed.analysis);
      const changelog = Array.isArray(parsed.changelog)
        ? parsed.changelog.map((entry: unknown) => changelogEntrySchema.parse(entry))
        : [];
      return { analysis, changelog };
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error("Failed to parse Gemini Corrector response as JSON.");
      }
      throw e;
    }
  }
}
