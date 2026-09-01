import { z } from "zod";
import { issueTypeEnum } from "./review";

export const changelogActionEnum = z.enum([
  "FIXED",
  "RETAINED",
  "MARKED_AS_AMBIGUITY",
  "SKIPPED",
]);

export const changelogEntrySchema = z.object({
  issueId: z.string(),
  type: issueTypeEnum,
  action: changelogActionEnum,
  summary: z.string(),
});

export const correctionTraceStatusEnum = z.enum(["CORRECTED", "RETAINED"]);

export const correctionTraceItemSchema = z.object({
  issueId: z.string(),
  type: issueTypeEnum,
  status: correctionTraceStatusEnum,
  summary: z.string().optional(),
});

export const correctionOutputSchema = z.object({
  analysis: z.unknown(),
  changelog: z.array(changelogEntrySchema),
});

export const correctionPipelineSchema = z.object({
  skipped: z.boolean(),
  skipReason: z.enum(["QUALITY_THRESHOLD", "NO_ISSUES"]).optional(),
  cycles: z.number().int().min(0).max(2),
  changelog: z.array(changelogEntrySchema),
  trace: z.array(correctionTraceItemSchema),
});

export type ChangelogEntry = z.infer<typeof changelogEntrySchema>;
export type CorrectionTraceItem = z.infer<typeof correctionTraceItemSchema>;
export type CorrectionOutput = z.infer<typeof correctionOutputSchema>;
export type CorrectionPipeline = z.infer<typeof correctionPipelineSchema>;
