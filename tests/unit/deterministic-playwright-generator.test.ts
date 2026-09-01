import ts from "typescript";
import { describe, expect, it } from "vitest";
import { generatePlaywrightTest } from "../../src/application/generate-playwright-test";
import { DeterministicPlaywrightGenerator } from "../../src/infrastructure/ai/deterministic-playwright-generator";
import { makeAnalysis } from "../helpers/qa-fixtures";

describe("DeterministicPlaywrightGenerator", () => {
  const testCase = makeAnalysis().scenarios[0];
  const input = { locale: "en" as const, requirement: "A registered customer can request password recovery.", additionalContext: "", testCase };

  it("generates a valid Playwright TypeScript skeleton from the approved test case", async () => {
    const result = await generatePlaywrightTest(new DeterministicPlaywrightGenerator(), input);
    const diagnostics = ts.transpileModule(result.code, {
      compilerOptions: { target: ts.ScriptTarget.ES2024 },
      reportDiagnostics: true,
    }).diagnostics ?? [];

    expect(result.generator).toBe("deterministic-playwright");
    expect(result.code).toContain('import { expect, test } from "@playwright/test"');
    expect(result.code).toContain("test.describe(");
    expect(result.code).toContain("test(");
    expect(result.code).toContain("await expect(");
    expect(result.code).toContain("Given a registered customer");
    expect(diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)).toEqual([]);
  });

  it("uses explicit placeholders instead of inventing technical details", async () => {
    const result = await generatePlaywrightTest(new DeterministicPlaywrightGenerator(), input);

    expect(result.code).toContain("https://YOUR-APPLICATION-URL");
    expect(result.code).toContain('name: "YOUR_BUTTON_NAME"');
    expect(result.code).toContain('"YOUR_EXPECTED_RESULT"');
    expect(result.code).toContain("TODO:");
    expect(result.code).toContain("const testData");
    expect(result.code).toContain("registered@example.com");
    expect(result.code).not.toMatch(/password\s*=|authorization\s*:/i);
  });

  it("rejects an invalid or incomplete final test case", async () => {
    await expect(
      generatePlaywrightTest(new DeterministicPlaywrightGenerator(), { requirement: "A requirement", testCase: { id: "TC-INVALID" } }),
    ).rejects.toThrow();
  });
});
