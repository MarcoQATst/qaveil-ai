import type { AIProvider } from "../../domain/ai/provider";
import type { CorrectorProvider } from "../../domain/ai/corrector-provider";
import type { JudgeProvider } from "../../domain/ai/judge-provider";
import type { PlaywrightGenerator } from "../../domain/ai/playwright-generator";
import { DeterministicAIProvider } from "./deterministic-provider";
import { DeterministicQACorrector } from "./deterministic-corrector";
import { DeterministicQAJudge } from "./deterministic-judge";
import { DeterministicPlaywrightGenerator } from "./deterministic-playwright-generator";
import { GeminiQACorrector } from "./gemini-corrector";
import { GeminiQAJudge } from "./gemini-judge";
import { GeminiPlaywrightGenerator } from "./gemini-playwright-generator";
import { GeminiAIProvider } from "./gemini-provider";

export type WiredProviders = {
  analyst: AIProvider;
  judge: JudgeProvider;
  corrector: CorrectorProvider;
  playwrightGenerator: PlaywrightGenerator;
};

export function createAiProviders(): WiredProviders {
  const providerName = process.env.AI_PROVIDER || "deterministic";

  if (providerName === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined, but AI_PROVIDER is set to 'gemini'.");
    }
    return {
      analyst: new GeminiAIProvider(apiKey),
      judge: new GeminiQAJudge(apiKey),
      corrector: new GeminiQACorrector(apiKey),
      playwrightGenerator: new GeminiPlaywrightGenerator(apiKey),
    };
  }

  return {
    analyst: new DeterministicAIProvider(),
    judge: new DeterministicQAJudge(),
    corrector: new DeterministicQACorrector(),
    playwrightGenerator: new DeterministicPlaywrightGenerator(),
  };
}
