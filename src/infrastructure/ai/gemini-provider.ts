import type { AIProvider } from "../../domain/ai/provider";
import type { RequirementAnalysis, RequirementInput } from "../../schemas/analysis";
import { analysisResultSchema } from "../../schemas/analysis";

export const GEMINI_JSON_SCHEMA = {
  type: "object",
  properties: {
    completeness: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["INCOMPLETE", "WEAK", "ACCEPTABLE", "GOOD", "EXCELLENT"] },
        score: { type: "integer" },
        rationale: { type: "string" }
      },
      required: ["status", "score", "rationale"]
    },
    summary: { type: "string" },
    requirementFacts: { type: "array", items: { type: "string" } },
    inferredRisks: { type: "array", items: { type: "string" } },
    requirementGaps: { type: "array", items: { type: "string" } },
    contradictions: { type: "array", items: { type: "string" } },
    qaImpact: {
      type: "object",
      properties: {
        criticalAreas: { type: "array", items: { type: "string" } },
        recommendedTesting: { type: "array", items: { type: "string" } },
        regressionAreas: { type: "array", items: { type: "string" } },
        blockers: { type: "array", items: { type: "string" } }
      },
      required: ["criticalAreas", "recommendedTesting", "regressionAreas", "blockers"]
    },
    actors: { type: "array", items: { type: "string" } },
    businessRules: { type: "array", items: { type: "string" } },
    dependencies: { type: "array", items: { type: "string" } },
    preconditions: { type: "array", items: { type: "string" } },
    postconditions: { type: "array", items: { type: "string" } },
    ambiguities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          problem: { type: "string" },
          requiredInformation: { type: "string" },
          questionForPo: { type: "string" }
        },
        required: ["term", "problem", "requiredInformation", "questionForPo"]
      }
    },
    missingInformation: { type: "array", items: { type: "string" } },
    questionsForPo: { type: "array", items: { type: "string" } },
    risk: {
      type: "object",
      properties: {
        impact: {
          type: "object",
          properties: { score: { type: "integer" }, rationale: { type: "string" } },
          required: ["score", "rationale"]
        },
        probability: {
          type: "object",
          properties: { score: { type: "integer" }, rationale: { type: "string" } },
          required: ["score", "rationale"]
        },
        complexity: {
          type: "object",
          properties: { score: { type: "integer" }, rationale: { type: "string" } },
          required: ["score", "rationale"]
        },
        detectability: {
          type: "object",
          properties: { score: { type: "integer" }, rationale: { type: "string" } },
          required: ["score", "rationale"]
        },
        rationale: { type: "string" },
        factors: { type: "array", items: { type: "string" } }
      },
      required: ["impact", "probability", "complexity", "detectability", "rationale", "factors"]
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
          steps: { type: "array", items: { type: "string" } },
          gherkin: { type: "string" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          expectedBehavior: { type: "string" },
          automation: { type: "string", enum: ["MANUAL", "AUTOMATION_RECOMMENDED", "AUTOMATION_HIGHLY_RECOMMENDED"] },
          coveredBehaviorIds: { type: "array", items: { type: "string" } },
          coveredBusinessRuleIds: { type: "array", items: { type: "string" } }
        },
        required: ["id", "title", "type", "category", "description", "prerequisites", "steps", "gherkin", "priority", "expectedBehavior", "automation", "coveredBehaviorIds", "coveredBusinessRuleIds"]
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
    },
    coverageSummary: {
      type: "object",
      properties: {
        totalTestCases: { type: "integer" },
        happyPathCases: { type: "integer" },
        negativeCases: { type: "integer" },
        edgeCases: { type: "integer" },
        validationCases: { type: "integer" },
        integrationCases: { type: "integer" },
        authorizationCases: { type: "integer" },
        uncoveredAreas: { type: "array", items: { type: "string" } }
      },
      required: ["totalTestCases", "happyPathCases", "negativeCases", "edgeCases", "validationCases", "integrationCases", "authorizationCases", "uncoveredAreas"]
    },
    regressionImpact: {
      type: "object",
      properties: {
        impactedModules: { type: "array", items: { type: "string" } }, relatedRules: { type: "array", items: { type: "string" } },
        relatedFeatures: { type: "array", items: { type: "string" } }, recommendedRegressionScenarios: { type: "array", items: { type: "string" } },
        potentialRequirementConflicts: { type: "array", items: { type: "string" } }
      },
      required: ["impactedModules", "relatedRules", "relatedFeatures", "recommendedRegressionScenarios", "potentialRequirementConflicts"]
    }
  },
  required: [
    "completeness",
    "summary",
    "requirementFacts",
    "inferredRisks",
    "requirementGaps",
    "contradictions",
    "qaImpact",
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
    "coverage",
    "coverageSummary", "regressionImpact"
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

    const systemPrompt = `You are an expert Quality Engineering assistant acting as a Senior QA Engineer. Your task is to analyze requirements, identify gaps, and produce structured QA intelligence and robust test scenarios.
You MUST output your response in JSON format conforming strictly to the provided JSON Schema.
All text values in the JSON MUST be written in ${isPt ? "Portuguese" : "English"}. Fix any encoding issues: do not emit corrupted characters like "Ã§", "Ã£o", "Ã¡". Always output proper UTF-8 text (e.g., "configuração", "usuário", "não").
${isPt ? "Use Portuguese Gherkin keywords: Funcionalidade, Cenário, Dado, Quando, Então, E." : "Use English Gherkin keywords: Feature, Scenario, Given, When, Then, And."}

GOLDEN RULE — Never invent. Never hallucinate:
- Do NOT invent business rules, limits, timeouts, error messages, user roles, API endpoints, payloads, or security details.
- If a detail is missing, mark it explicitly as "Lacuna do requisito: ..." (pt) or "Requirement gap: ..." (en) in the relevant field.
- If something is a QA recommendation, mark it as "Recomendação QA: ..." (pt) or "QA Recommendation: ..." (en).
- Never present an inferred risk as if it were a stated business rule.

SEPARATION OF FACTS AND INFERENCES:
- 'requirementFacts': Only list information EXPLICITLY stated in the requirement text. Quote or closely paraphrase the source.
- 'inferredRisks': List risks that are technically implied but NOT explicitly stated. Prefix with "Inferência QA:" or "QA Inference:".
- 'requirementGaps': List missing information that would be needed to write objective, deterministic PASS/FAIL tests. Prefix with "Lacuna do requisito:" or "Requirement gap:".
- 'contradictions': List only real contradictions or conflicts found WITHIN the requirement text itself. Do NOT invent contradictions.

COMPLETENESS EVALUATION ('completeness'):
Evaluate the requirement's testability based on the context, NOT on a fixed checklist. A simple requirement can be EXCELLENT without having security or performance specs.
Evaluate only aspects relevant to the requirement's nature:
- Does it have a clear objective?
- Are actors/users identified?
- Are business rules explicitly stated?
- Are inputs and outputs defined?
- Is the success path clear?
- Is error handling defined?
- Are limits or constraints provided?
- Are dependencies mentioned?
- Are there acceptance criteria?

Scoring scale (integer 0-100):
- 95-100 → EXCELLENT
- 80-94  → GOOD
- 60-79  → ACCEPTABLE
- 40-59  → WEAK
- 0-39   → INCOMPLETE

Do NOT penalize a simple requirement for lacking security specs or performance targets if these are not relevant to its scope.

RISK SCORING — STRICT RULES:
Evaluate each factor independently (integer 0-5). Do NOT round up to CRITICAL just because a domain involves money, authentication, APIs, or databases. A simple and well-specified requirement MUST NOT receive CRITICAL risk just because it involves an important feature.
Consider: real domain criticality, amount and severity of gaps, external dependencies, and real financial/security impact.
- 'impact' (0-5): How severe would a failure be on users, business, or data integrity? 0=no real impact, 5=major financial loss or data breach.
- 'probability' (0-5): How likely is a defect to occur given the complexity, dependencies, and requirement gaps? 0=nearly impossible, 5=very common.
- 'complexity' (0-5): How technically complex is implementation? 0=trivial, 5=multiple integrations, concurrency, distributed state.
- 'detectability' (0-5): How HARD is it to detect a failure BEFORE it reaches production? HIGHER score = HARDER to detect. 0=immediately obvious, 5=failure is silent and only noticed much later.

Total score = impact + probability + complexity + detectability.
Classification: 0-5=LOW, 6-10=MEDIUM, 11-15=HIGH, 16-20=CRITICAL.
You MUST include a 'rationale' explaining the reasoning and a 'factors' array listing the key risk drivers.
Note: score and level are computed automatically from the sub-scores. Focus on scoring each factor accurately.

STRUCTURED AMBIGUITIES:
For each vague or subjective term (e.g., "quickly", "secure", "correct", "many users", "when necessary"), populate an ambiguity object with: term, problem, requiredInformation, questionForPo.
Only report ambiguities that actually exist in the requirement. Do NOT invent ambiguities.

QA IMPACT ('qaImpact'):
Based only on what is stated or clearly inferable from the requirement:
- criticalAreas: parts of the system that are most critical to test correctly
- recommendedTesting: specific testing types recommended (unit, integration, contract, E2E, performance, security, etc.)
- regressionAreas: areas most likely to break if this requirement changes
- blockers: information or conditions that would BLOCK testing from starting

DETAILED GUIDELINES FOR OTHER FIELDS:
1. 'summary': Concise objective summary of what the requirement is asking.
2. 'actors': Who or what is involved (users, systems, roles). Only those mentioned or clearly inferable.
3. 'businessRules': Only rules EXPLICITLY stated. Never invent.
4. 'dependencies': External systems, APIs, databases explicitly required or clearly implied.
5. 'preconditions': State the system must be in before this action can occur.
6. 'postconditions': Observable state changes that must hold true after success.
7. 'missingInformation': What is specifically absent that prevents writing deterministic tests.
8. 'questionsForPo': Concrete questions that would allow writing better, more objective tests.
9. 'hiddenRisks': Technical risks implied by the context (concurrency, race conditions, auth bypass, data leaks, latency, failure recovery). Mark each as inference.
10. COVERAGE-FIRST TEST DESIGN (perform this internally before writing 'scenarios'):
   a) Decompose the requirement into every explicitly described testable behavior: flows, alternatives, fields, rules, states, pre/postconditions, dependencies, actors/permissions, and integrations.
   b) For EACH behavior, consider only relevant dimensions from this matrix: happy path, alternative variation, required/optional fields, valid/invalid values, boundaries/formats, explicit business rules, state transitions, authentication/authorization, integration/API errors, timeout/unavailability, duplicates/concurrency, persistence, recovery, edge cases, and regression.
   c) Do NOT create a scenario just because a matrix dimension exists. Use it only when the requirement makes it applicable and a testable expectation is explicit. If an expectation is missing, record a gap/ambiguity/assumption instead of inventing an outcome.
   d) Generate one or more specific scenarios for every behavior that needs independent verification. A complex requirement with multiple rules, flows, fields, states, or integrations must receive as many scenarios as coverage requires. There is NO fixed minimum or maximum number of scenarios.
   e) Before returning, ask internally: "Does every explicitly described behavior have at least one Test Case?" and "Are relevant negative or boundary conditions from explicit rules covered?" Add only the supported missing scenarios.
11. 'scenarios': Each scenario must have id (TC-001...), a specific title, type, priority, detailed description, explicit prerequisites, concrete test data derived from the requirement (or a clearly labelled gap), detailed steps, observable expectedBehavior, Gherkin, coveredBehaviorIds and coveredBusinessRuleIds. References may contain ONLY REQ-xxx / BR-xxx IDs that correspond to requirementFacts/businessRules in this same response. Never use generic steps such as "fill data", "click button", or "verify result". State exactly which requirement-defined data/action/result is involved. When the expected outcome is unknown, say it is a requirement gap; do not assert an invented behavior.
12. 'edgeCases': Technical edge cases relevant to the requirement. Keep empty if not determinable.
13. 'gherkin': Include only the Gherkin scenarios needed for supported test cases. Every Test Case Gherkin must start with Feature/Funcionalidade then Scenario/Cenário and use Given/Dado, When/Quando, Then/Então plus And/E only when needed. Use 2-space indentation. No markdown fences.
14. 'coverage': Estimate percentages 0-100 based on the matrix dimensions actually relevant to this requirement. If the requirement is too vague for reliable testing, keep these low.
15. 'coverageSummary': Count the generated scenarios by purpose. totalTestCases MUST equal scenarios.length. validationCases includes scenarios validating explicit field/rule/format constraints. uncoveredAreas lists explicit behaviors that could not receive an objective Test Case because the requirement omits the expected outcome; state the missing information. It must be empty when every explicit behavior is objectively covered.
16. 'regressionImpact': Use ONLY relevant project context supplied with provenance. List known related modules, rules, features and supported regression scenarios. If a confirmed project rule conflicts with the current requirement, add a clear POTENTIAL_REQUIREMENT_CONFLICT entry. Keep all arrays empty when no project context is relevant.`;


    const userPrompt = `Please analyze the following requirement details:
Locale: ${input.locale}
User Story: ${input.userStory || "Not provided"}
Requirement: ${input.requirement}
Acceptance Criteria: ${input.acceptanceCriteria || "Not provided"}
Additional Context: ${input.additionalContext || "Not provided"}
Relevant Project Context (with provenance): ${input.projectContext?.promptContext || "Not provided"}`;

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
      if (response.status === 429) {
        throw new Error(`Gemini API error: Rate limit exceeded or quota exhausted (Status 429). Please try again later.`);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Gemini API error: Invalid or unauthorized API key (Status ${response.status}).`);
      }
      throw new Error(`Gemini API error: Request failed with status ${response.status}.`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Invalid response structure from Gemini API: Missing candidate text.");
    }

    try {
      const parsed = JSON.parse(text);
      return analysisResultSchema.parse(parsed);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error("Failed to parse Gemini response as JSON: " + text);
      }
      throw e;
    }
  }
}
