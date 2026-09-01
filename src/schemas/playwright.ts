import { z } from "zod";
import { testScenarioSchema } from "./analysis";

export const playwrightGenerationInputSchema = z.object({
  locale: z.enum(["pt", "en"]).default("pt"),
  requirement: z.string().trim().min(1).max(10_000),
  additionalContext: z.string().trim().max(5_000).optional().default(""),
  testCase: testScenarioSchema,
});
