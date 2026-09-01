import { z } from "zod";

export const issueTypeEnum = z.enum([
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
]);

export const issueSeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const qaIssueSchema = z.object({
  id: z.string(),
  type: issueTypeEnum,
  severity: issueSeverityEnum,
  description: z.string(),
  affectedTestCase: z.string().optional(),
  recommendedAction: z.string(),
});

const qaReviewObjectSchema = z.object({
  score: z.number().int().min(0).max(100),
  overallAssessment: z.string(),
  strengths: z.array(z.string()),
  issues: z.array(qaIssueSchema),
  missingScenarios: z.array(z.string()),
  potentiallyInventedRules: z.array(z.string()),
  gherkinIssues: z.array(z.string()),
  coverageAssessment: z.string(),
  recommendations: z.array(z.string()),
});

function normalizeReview(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return {
    ...record,
    issues: record.issues ?? record.issuesFound ?? [],
    missingScenarios: record.missingScenarios ?? record.missingTestScenarios ?? [],
  };
}

/** Accepts current field names and the previous `issuesFound` / `missingTestScenarios` aliases. */
export const qaReviewSchema = z.preprocess(normalizeReview, qaReviewObjectSchema);

export type IssueType = z.infer<typeof issueTypeEnum>;
export type IssueSeverity = z.infer<typeof issueSeverityEnum>;
export type QAIssue = z.infer<typeof qaIssueSchema>;
export type QAReview = z.infer<typeof qaReviewObjectSchema>;
