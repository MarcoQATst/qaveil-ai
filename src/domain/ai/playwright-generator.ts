import type { TestScenario } from "../../schemas/analysis";

export type PlaywrightGenerationInput = {
  locale: "pt" | "en";
  requirement: string;
  additionalContext?: string;
  testCase: TestScenario;
};

export type PlaywrightGeneration = {
  code: string;
  generator: string;
};

export interface PlaywrightGenerator {
  readonly name: string;
  generate(input: PlaywrightGenerationInput): Promise<PlaywrightGeneration>;
}
