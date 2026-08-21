import type { RequirementAnalysis, RequirementInput } from "../../schemas/analysis";

export interface AIProvider {
  readonly name: string;
  analyzeRequirement(input: RequirementInput): Promise<RequirementAnalysis>;
}
