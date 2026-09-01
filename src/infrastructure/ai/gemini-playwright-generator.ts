import type { PlaywrightGenerationInput, PlaywrightGenerator } from "../../domain/ai/playwright-generator";

export class GeminiPlaywrightGenerator implements PlaywrightGenerator {
  readonly name = "gemini-playwright";

  constructor(private readonly apiKey: string, private readonly model: string = "gemini-3.6-flash") {
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not defined.");
  }

  async generate(input: PlaywrightGenerationInput) {
    const isPt = input.locale === "pt";
    const systemPrompt = `You generate exactly one safe TypeScript Playwright .spec.ts file from an approved QA Test Case.
Return ONLY raw TypeScript. No JSON, Markdown fences, explanation, or prose outside code.
Use import { test, expect } from "@playwright/test", test.describe, one async test, modern role/label/text locators, and assertions. Never use fixed sleeps or XPath.
SOURCE OF TRUTH: the supplied final Test Case is primary; the requirement/context merely clarify it. Do not reinterpret the requirement or add scenarios.
NEVER invent URLs, routes, locators, HTML IDs, field names, credentials, users, endpoints, tokens, environment configuration, business rules, or assertion text.
When technical details are absent, use clear placeholders such as BASE_URL = "https://YOUR-APPLICATION-URL", "YOUR_FIELD_NAME", "YOUR_BUTTON_NAME", and TODO comments.
Map Given to setup/navigation, When to actions, Then to assertions, and And according to its preceding block when sufficient information exists. Do not merely copy Gherkin as comments when an action/assertion is supported; do preserve unsupported detail in a TODO.
Use supplied test data in a const testData object when available; do not create extra data. If the expected result cannot form a concrete assertion, write a TODO and use a placeholder assertion.
All comments must be in ${isPt ? "Portuguese" : "English"}.`;
    const userPrompt = `REQUIREMENT:\n${input.requirement}\n\nCONTEXT:\n${input.additionalContext || "Not provided"}\n\nAPPROVED FINAL TEST CASE:\n${JSON.stringify(input.testCase, null, 2)}`;
    let response: Response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ parts: [{ text: userPrompt }] }], generationConfig: { responseMimeType: "text/plain" } }),
      });
    } catch {
      throw new Error("Gemini Playwright Generator error: Provider unavailable or request timed out.");
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error("Gemini Playwright Generator error: Rate limit exceeded (Status 429).");
      if (response.status === 503) throw new Error("Gemini Playwright Generator error: Provider unavailable (Status 503).");
      throw new Error(`Gemini Playwright Generator error: Request failed with status ${response.status}.`);
    }
    const data = await response.json();
    const code = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof code !== "string" || !code.trim()) throw new Error("Gemini Playwright Generator error: Invalid or empty response.");
    return { generator: this.name, code };
  }
}
