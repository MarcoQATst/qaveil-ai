import { NextResponse } from "next/server";
import { generatePlaywrightTest } from "../../../application/generate-playwright-test";
import { createAiProviders } from "../../../infrastructure/ai/create-providers";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object" || !("testCase" in payload) || !("requirement" in payload)) {
      throw new Error("A final test case is required to generate Playwright code.");
    }

    const result = await generatePlaywrightTest(createAiProviders().playwrightGenerator, payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate Playwright code.";
    const status = /Status 429/.test(message) ? 429 : /Status 503|unavailable|timed out/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
