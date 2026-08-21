import type { AIProvider } from "../domain/ai/provider";
import { analysisResultSchema, type RequirementInput } from "../schemas/analysis";

export async function analyzeRequirement(provider: AIProvider, input: RequirementInput) {
  const result = await provider.analyzeRequirement(input);
  return analysisResultSchema.parse(result);
}
