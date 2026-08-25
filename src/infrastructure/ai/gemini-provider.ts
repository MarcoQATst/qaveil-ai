import type { AIProvider } from "../../domain/ai/provider";
import type { RequirementAnalysis, RequirementInput } from "../../schemas/analysis";

const GEMINI_JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    actors: { type: "array", items: { type: "string" } },
    businessRules: { type: "array", items: { type: "string" } },
    dependencies: { type: "array", items: { type: "string" } },
    preconditions: { type: "array", items: { type: "string" } },
    postconditions: { type: "array", items: { type: "string" } },
    ambiguities: { type: "array", items: { type: "string" } },
    missingInformation: { type: "array", items: { type: "string" } },
    questionsForPo: { type: "array", items: { type: "string" } },
    risk: {
      type: "object",
      properties: {
        score: { type: "integer" },
        level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
        rationale: { type: "string" },
        factors: { type: "array", items: { type: "string" } }
      },
      required: ["score", "level", "rationale", "factors"]
    },
    hiddenRisks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          risk: { type: "string" },
          whyItMatters: { type: "string" },
          suggestedTest: { type: "string" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] }
        },
        required: ["risk", "whyItMatters", "suggestedTest", "priority"]
      }
    },
    scenarios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          type: { type: "string" },
          category: { type: "string", enum: ["POSITIVE", "NEGATIVE", "BOUNDARY", "SECURITY", "INTEGRATION", "REGRESSION"] },
          description: { type: "string" },
          prerequisites: { type: "array", items: { type: "string" } },
          testData: { type: "string" },
          gherkin: { type: "string" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          expectedBehavior: { type: "string" },
          automation: { type: "string", enum: ["MANUAL", "AUTOMATION_RECOMMENDED", "AUTOMATION_HIGHLY_RECOMMENDED"] }
        },
        required: ["id", "title", "type", "category", "description", "prerequisites", "gherkin", "priority", "expectedBehavior", "automation"]
      }
    },
    edgeCases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: { type: "string" },
          category: { type: "string", enum: ["BOUNDARY", "INVALID_INPUT", "DATA_TYPE", "FORMAT", "UNEXPECTED_INPUT", "SECURITY"] },
          reason: { type: "string" }
        },
        required: ["value", "category", "reason"]
      }
    },
    gherkin: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          category: { type: "string", enum: ["HAPPY_PATH", "NEGATIVE", "BOUNDARY", "SECURITY"] },
          content: { type: "string" }
        },
        required: ["title", "category", "content"]
      }
    },
    coverage: {
      type: "object",
      properties: {
        functional: { type: "integer" },
        negative: { type: "integer" },
        boundary: { type: "integer" },
        security: { type: "integer" },
        integration: { type: "integer" },
        regression: { type: "integer" },
        lowCoverageAreas: { type: "array", items: { type: "string" } }
      },
      required: ["functional", "negative", "boundary", "security", "integration", "regression", "lowCoverageAreas"]
    }
  },
  required: [
    "summary",
    "actors",
    "businessRules",
    "dependencies",
    "preconditions",
    "postconditions",
    "ambiguities",
    "missingInformation",
    "questionsForPo",
    "risk",
    "hiddenRisks",
    "scenarios",
    "edgeCases",
    "gherkin",
    "coverage"
  ]
};

export class GeminiAIProvider implements AIProvider {
  readonly name = "gemini";
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string = "gemini-3.6-flash") {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeRequirement(input: RequirementInput): Promise<RequirementAnalysis> {
    const isPt = input.locale === "pt";

    const systemPrompt = `You are an expert Quality Engineering assistant acting as a Senior QA Engineer. Your task is to analyze user requirements/stories, identify gaps, and produce structured QA intelligence and robust test scenarios.
You MUST output your response in JSON format conforming strictly to the provided JSON Schema.
All text values in the JSON (summaries, rules, rationale, scenario descriptions, questions, risk factors, edge cases, etc.) MUST be written in ${isPt ? "Portuguese" : "English"}.
Specifically, if locale is 'pt', the Gherkin syntax should use Portuguese keywords (Funcionalidade, Cenário, Dado, Quando, Então, E). If 'en', use English (Feature, Scenario, Given, When, Then, And).

Guidelines for fields:
1. 'summary': A concise summary of the requirement's objective.
2. 'actors': Key actors or systems involved.
3. 'businessRules': Hard constraints and business rules extracted from the text (do not invent rules).
4. 'dependencies': External services, APIs, databases, or systems required.
5. 'preconditions': Initial system state/setup needed.
6. 'postconditions': Expected end states or side-effects (e.g., notifications).
7. 'ambiguities': Identify vague terms, contradictions, or missing critical info as ambiguities.
8. 'missingInformation': What information is missing to properly test/implement (e.g., limits, timeouts).
9. 'questionsForPo': Direct questions for the Product Owner to clarify requirements.
10. 'risk': Assess the risk score (0-20) as the sum of impact (0-5), probability (0-5), complexity (0-5), and detectability (0-5). Determine risk 'level' based on score: >=16 is CRITICAL, >=11 is HIGH, >=6 is MEDIUM, else LOW. Provide a 'rationale' and list the 'factors'.
11. 'hiddenRisks': List potential hidden risks (concurrency, race conditions, auth bypass, data leaks, latency, failure recovery) with 'whyItMatters', a 'suggestedTest', and 'priority' (LOW, MEDIUM, HIGH, CRITICAL).
12. 'scenarios': Generate deep, meaningful test scenarios. First cover the stated happy path and explicitly stated rules. Then add negative, alternative, boundary, required-field, invalid-data, authentication, authorization, session, timeout, API-failure, duplicate-request, and edge-case scenarios ONLY when the requirement or a dependency makes them applicable. Never fabricate business rules, limits, roles, endpoints, messages, or outcomes. If a detail is required to execute a test but was not supplied, state it in prerequisites as 'Premissa:' or 'Lacuna do requisito:' instead of asserting it as fact. Provide at least 5 scenarios with unique IDs ('TC-001', 'TC-002', etc.). Each scenario MUST contain: title, type (e.g., 'Functional', 'Security', 'API', 'UI'), category, description with a concrete test objective, prerequisites, testData (specific representative data or 'N/A'), valid Gherkin matching exactly that test case, priority, observable expectedBehavior, and automation recommendation level.
13. 'edgeCases': Technical edge cases (boundary values, invalid data types, security exploits, empty inputs).
14. 'gherkin': Write at least 3 distinct Gherkin scenarios covering HAPPY_PATH, NEGATIVE, and optionally BOUNDARY/SECURITY.
15. 'coverage': Estimate coverage percentages (0 to 100) for different testing types, and list 'lowCoverageAreas'.
16. Every Gherkin value must begin with Feature/Funcionalidade followed by Scenario/CenÃ¡rio, use Given/Dado, When/Quando and Then/EntÃ£o, and include And/E only where it improves clarity. Preserve two-space indentation for steps. Do not emit markdown fences.`;

    const userPrompt = `Please analyze the following requirement details:
Locale: ${input.locale}
User Story: ${input.userStory || "Not provided"}
Requirement: ${input.requirement}
Acceptance Criteria: ${input.acceptanceCriteria || "Not provided"}
Additional Context: ${input.additionalContext || "Not provided"}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },
        contents: [
          {
            parts: [
              {
                text: userPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_JSON_SCHEMA,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (Status ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Invalid response structure from Gemini API: Missing candidate text.");
    }

    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (e) {
      throw new Error("Failed to parse Gemini response as JSON: " + text);
    }
  }
}
