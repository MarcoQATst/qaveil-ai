import { z } from "zod";

export const requirementInputSchema = z.object({
  locale: z.enum(["pt", "en"]).default("pt"),
  userStory: z.string().trim().max(2_000).optional().default(""),
  requirement: z.string().trim().min(20, "Describe the requirement in at least 20 characters.").max(10_000),
  acceptanceCriteria: z.string().trim().max(5_000).optional().default(""),
  additionalContext: z.string().trim().max(5_000).optional().default(""),
});

export const analysisResultSchema = z.object({
  summary: z.string(),
  actors: z.array(z.string()),
  businessRules: z.array(z.string()),
  dependencies: z.array(z.string()),
  preconditions: z.array(z.string()),
  postconditions: z.array(z.string()),
  ambiguities: z.array(z.string()),
  missingInformation: z.array(z.string()),
  questionsForPo: z.array(z.string()),
  risk: z.object({
    score: z.number().int().min(0).max(20),
    level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    rationale: z.string(),
    factors: z.array(z.string()),
  }),
  hiddenRisks: z.array(z.object({
    risk: z.string(),
    whyItMatters: z.string(),
    suggestedTest: z.string(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  })),
  scenarios: z.array(z.object({
    id: z.string(),
    title: z.string(),
    category: z.enum(["POSITIVE", "NEGATIVE", "BOUNDARY", "SECURITY", "INTEGRATION", "REGRESSION"]),
    description: z.string(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    expectedBehavior: z.string(),
    automation: z.enum(["MANUAL", "AUTOMATION_RECOMMENDED", "AUTOMATION_HIGHLY_RECOMMENDED"]),
  })),
  edgeCases: z.array(z.object({
    value: z.string(),
    category: z.enum(["BOUNDARY", "INVALID_INPUT", "DATA_TYPE", "FORMAT", "UNEXPECTED_INPUT", "SECURITY"]),
    reason: z.string(),
  })),
  gherkin: z.array(z.object({
    title: z.string(),
    category: z.enum(["HAPPY_PATH", "NEGATIVE", "BOUNDARY", "SECURITY"]),
    content: z.string(),
  })),
  coverage: z.object({
    functional: z.number().min(0).max(100),
    negative: z.number().min(0).max(100),
    boundary: z.number().min(0).max(100),
    security: z.number().min(0).max(100),
    integration: z.number().min(0).max(100),
    regression: z.number().min(0).max(100),
    lowCoverageAreas: z.array(z.string()),
  }),
});

export const analysisResponseSchema = z.object({
  analysis: analysisResultSchema,
  provider: z.string(),
});

export type RequirementInput = z.infer<typeof requirementInputSchema>;
export type RequirementAnalysis = z.infer<typeof analysisResultSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
