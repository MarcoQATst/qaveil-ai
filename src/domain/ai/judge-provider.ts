import type { RequirementInput, RequirementAnalysis } from "../../schemas/analysis";
import type { QAReview } from "../../schemas/review";

export interface JudgeProvider {
  readonly name: string;
  reviewAnalysis(input: RequirementInput, analysis: RequirementAnalysis): Promise<QAReview>;
}
