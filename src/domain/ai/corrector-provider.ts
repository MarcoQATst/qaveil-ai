import type { RequirementAnalysis, RequirementInput } from "../../schemas/analysis";
import type { ChangelogEntry } from "../../schemas/correction";

export type CorrectorInput = {
  input: RequirementInput;
  originalAnalysis: RequirementAnalysis;
  review: import("../../schemas/review").QAReview;
};

export type CorrectorResult = {
  analysis: RequirementAnalysis;
  changelog: ChangelogEntry[];
};

export interface CorrectorProvider {
  readonly name: string;
  correctAnalysis(payload: CorrectorInput): Promise<CorrectorResult>;
}
