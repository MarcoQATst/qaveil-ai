import type { AIProvider } from "../domain/ai/provider";
import type { CorrectorProvider } from "../domain/ai/corrector-provider";
import type { JudgeProvider } from "../domain/ai/judge-provider";
import { analysisResultSchema, type AnalysisResponse, type RequirementAnalysis, type RequirementInput } from "../schemas/analysis";
import type { ChangelogEntry, CorrectionPipeline } from "../schemas/correction";
import type { QAReview } from "../schemas/review";
import { analyzeRequirement } from "./analyze-requirement";
import { AUTO_CORRECT_POLICY, shouldAutoCorrect } from "./auto-correct-policy";
import { buildCorrectionTrace } from "./correction-trace";

export type PipelineProviders = {
  analyst: AIProvider;
  judge?: JudgeProvider;
  corrector?: CorrectorProvider;
};

export async function analyzeWithReview(
  providers: PipelineProviders,
  input: RequirementInput,
): Promise<AnalysisResponse> {
  const analysis = await analyzeRequirement(providers.analyst, input);
  const review = providers.judge ? await providers.judge.reviewAnalysis(input, analysis) : undefined;

  return {
    analysis,
    originalAnalysis: analysis,
    review,
    initialReview: review,
    provider: providers.analyst.name,
  };
}

export async function autoCorrectAnalysis(
  providers: PipelineProviders,
  input: RequirementInput,
  originalAnalysis: RequirementAnalysis,
  initialReview: QAReview,
): Promise<AnalysisResponse> {
  if (!providers.judge) {
    throw new Error("QA Judge provider is required to re-evaluate a corrected analysis.");
  }
  if (!providers.corrector) {
    throw new Error("QA Corrector provider is required to apply automatic corrections.");
  }

  if (!shouldAutoCorrect(initialReview)) {
    const skipReason = initialReview.issues.length === 0 ? "NO_ISSUES" : "QUALITY_THRESHOLD";
    const correction: CorrectionPipeline = {
      skipped: true,
      skipReason,
      cycles: 0,
      changelog: [],
      trace: [],
    };
    return {
      analysis: originalAnalysis,
      originalAnalysis,
      review: initialReview,
      initialReview,
      finalReview: initialReview,
      correction,
      provider: providers.corrector.name,
    };
  }

  let current = originalAnalysis;
  let lastReview = initialReview;
  let cycles = 0;
  const changelog: ChangelogEntry[] = [];

  while (cycles < AUTO_CORRECT_POLICY.maxCycles && shouldAutoCorrect(lastReview)) {
    cycles += 1;
    const result = await providers.corrector.correctAnalysis({
      input,
      originalAnalysis: current,
      review: lastReview,
    });
    current = analysisResultSchema.parse(result.analysis);
    changelog.push(...result.changelog);
    lastReview = await providers.judge.reviewAnalysis(input, current);
  }

  const correction: CorrectionPipeline = {
    skipped: false,
    cycles,
    changelog,
    trace: buildCorrectionTrace(initialReview, lastReview, changelog),
  };

  return {
    analysis: current,
    originalAnalysis,
    review: lastReview,
    initialReview,
    finalReview: lastReview,
    correction,
    provider: providers.corrector.name,
  };
}

export async function runAnalysisPipeline(
  providers: PipelineProviders,
  input: RequirementInput,
  options: { autoCorrect?: boolean } = {},
): Promise<AnalysisResponse> {
  const initial = await analyzeWithReview(providers, input);
  if (!options.autoCorrect || !initial.review) {
    return initial;
  }
  return autoCorrectAnalysis(providers, input, initial.analysis, initial.review);
}
