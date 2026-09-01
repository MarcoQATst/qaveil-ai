import type { RequirementAnalysis, RequirementInput } from "../../src/schemas/analysis";
import type { QAIssue, QAReview } from "../../src/schemas/review";

export const sampleInput: RequirementInput = {
  locale: "en",
  userStory: "As a customer, I want to reset my password.",
  requirement: "The system sends a recovery email when a registered customer requests a password reset.",
  acceptanceCriteria: "Only registered emails can request recovery.",
  additionalContext: "",
};

export function makeIssue(overrides: Partial<QAIssue> & Pick<QAIssue, "type">): QAIssue {
  return {
    id: overrides.id ?? "ISSUE-001",
    type: overrides.type,
    severity: overrides.severity ?? "HIGH",
    description: overrides.description ?? "Issue description",
    affectedTestCase: overrides.affectedTestCase,
    recommendedAction: overrides.recommendedAction ?? "Fix the issue without inventing rules.",
  };
}

export function makeReview(overrides: Partial<QAReview> = {}): QAReview {
  return {
    score: 72,
    overallAssessment: "The analysis has gaps.",
    strengths: ["Identified missing information."],
    issues: [makeIssue({ type: "MISSING_SCENARIO", id: "ISSUE-001" })],
    missingScenarios: ["Negative recovery request"],
    potentiallyInventedRules: [],
    gherkinIssues: [],
    coverageAssessment: "Functional coverage is incomplete.",
    recommendations: ["Add a negative scenario based on the requirement."],
    ...overrides,
  };
}

export function makeAnalysis(overrides: Partial<RequirementAnalysis> = {}): RequirementAnalysis {
  const base: RequirementAnalysis = {
    completeness: { status: "ACCEPTABLE", score: 70, rationale: "Enough to test the happy path." },
    summary: "Password recovery via email.",
    requirementFacts: ["Only registered emails can request recovery."],
    inferredRisks: ["QA Inference: Email delivery may fail."],
    requirementGaps: ["Requirement gap: Token expiry is not defined."],
    contradictions: [],
    qaImpact: {
      criticalAreas: ["Email delivery"],
      recommendedTesting: ["Functional"],
      regressionAreas: ["Authentication"],
      blockers: [],
    },
    actors: ["customer"],
    businessRules: ["Only registered emails can request recovery."],
    dependencies: ["Email service"],
    preconditions: ["Customer has a registered email"],
    postconditions: ["Recovery email is sent"],
    ambiguities: [],
    missingInformation: ["Token expiry duration."],
    questionsForPo: ["How long is the token valid?"],
    risk: {
      impact: { score: 4, rationale: "Account recovery is blocked." },
      probability: { score: 2, rationale: "Straightforward flow." },
      complexity: { score: 2, rationale: "Single integration." },
      detectability: { score: 2, rationale: "Failures are visible." },
      score: 10,
      level: "MEDIUM",
      rationale: "Moderate recovery risk.",
      factors: ["email"],
    },
    hiddenRisks: [],
    scenarios: [
      {
        id: "TC-001",
        title: "Registered customer requests recovery",
        type: "Functional",
        category: "POSITIVE",
        description: "Happy path.",
        prerequisites: ["Registered email exists"],
        testData: "registered@example.com",
        steps: ["Submit registered email"],
        gherkin: "Scenario: Request recovery\n  Given a registered customer\n  When they request a reset\n  Then an email is sent",
        priority: "HIGH",
        expectedBehavior: "OK",
        automation: "AUTOMATION_RECOMMENDED",
      },
    ],
    edgeCases: [],
    gherkin: [
      {
        title: "Happy path",
        category: "HAPPY_PATH",
        content: "Scenario: Request recovery\n  Given a registered customer\n  When they request a reset\n  Then an email is sent",
      },
    ],
    coverage: {
      functional: 70,
      negative: 20,
      boundary: 10,
      security: 20,
      integration: 40,
      regression: 30,
      lowCoverageAreas: ["Negative path"],
    },
    coverageSummary: {
      totalTestCases: 1,
      happyPathCases: 1,
      negativeCases: 0,
      edgeCases: 0,
      validationCases: 0,
      integrationCases: 0,
      authorizationCases: 0,
      uncoveredAreas: ["Invalid-email behavior is not specified."],
    },
  };
  return { ...base, ...overrides };
}
