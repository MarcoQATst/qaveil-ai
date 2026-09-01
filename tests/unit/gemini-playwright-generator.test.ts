import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generatePlaywrightTest } from "../../src/application/generate-playwright-test";
import { GeminiPlaywrightGenerator } from "../../src/infrastructure/ai/gemini-playwright-generator";
import { makeAnalysis } from "../helpers/qa-fixtures";

const input = {
  locale: "en" as const,
  requirement: "A registered customer can request a password recovery email.",
  additionalContext: "The recovery form is available to visitors.",
  testCase: makeAnalysis().scenarios[0],
};
const validCode = `import { expect, test } from "@playwright/test";
test.describe("Recovery", () => {
  test("sends a request", async ({ page }) => {
    await page.goto("https://YOUR-APPLICATION-URL");
    await expect(page.getByText("YOUR_EXPECTED_RESULT")).toBeVisible();
  });
});`;

describe("GeminiPlaywrightGenerator", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("generates and validates code using a mocked Gemini response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: validCode }] } }] }) } as Response);
    const result = await generatePlaywrightTest(new GeminiPlaywrightGenerator("test-key"), input);

    expect(result.generator).toBe("gemini-playwright");
    expect(result.code).toContain("test.describe");
    const request = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(request.systemInstruction.parts[0].text).toContain("NEVER invent URLs");
    expect(request.contents[0].parts[0].text).toContain(input.testCase.id);
  });

  it.each([[429, "Rate limit exceeded"], [503, "Provider unavailable"]])("reports Gemini status %s", async (status, message) => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status } as Response);
    await expect(new GeminiPlaywrightGenerator("test-key").generate(input)).rejects.toThrow(message);
  });

  it("reports timeout/provider failure and invalid responses", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
    await expect(new GeminiPlaywrightGenerator("test-key").generate(input)).rejects.toThrow("Provider unavailable or request timed out");
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ candidates: [] }) } as Response);
    await expect(new GeminiPlaywrightGenerator("test-key").generate(input)).rejects.toThrow("Invalid or empty response");
  });

  it("rejects Markdown and possible credentials returned by Gemini", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: `\`\`\`ts\n${validCode}\n\`\`\`` }] } }] }) } as Response);
    await expect(generatePlaywrightTest(new GeminiPlaywrightGenerator("test-key"), input)).rejects.toThrow("Markdown fences");
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: `${validCode}\nconst apiKey = "abcdefghijk";` }] } }] }) } as Response);
    await expect(generatePlaywrightTest(new GeminiPlaywrightGenerator("test-key"), input)).rejects.toThrow("possible secret or credential");
  });
});
