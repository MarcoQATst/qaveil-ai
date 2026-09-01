import type { PlaywrightGenerator } from "../domain/ai/playwright-generator";
import { playwrightGenerationInputSchema } from "../schemas/playwright";
import { validatePlaywrightCode } from "./playwright-code-validation";

export async function generatePlaywrightTest(generator: PlaywrightGenerator, input: unknown) {
  const result = await generator.generate(playwrightGenerationInputSchema.parse(input));
  return { ...result, code: validatePlaywrightCode(result.code) };
}
