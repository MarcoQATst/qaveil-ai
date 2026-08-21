import { NextResponse } from "next/server";
import { analyzeRequirement } from "../../../application/analyze-requirement";
import { DeterministicAIProvider } from "../../../infrastructure/ai/deterministic-provider";
import { requirementInputSchema } from "../../../schemas/analysis";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const input = requirementInputSchema.parse(payload);
    const provider = new DeterministicAIProvider();
    const analysis = await analyzeRequirement(provider, input);

    return NextResponse.json({ analysis, provider: provider.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze the requirement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
