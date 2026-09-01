import type { PlaywrightGenerationInput, PlaywrightGenerator } from "../../domain/ai/playwright-generator";

function asComment(value: string) {
  return value.replace(/\r?\n/g, " ").replace(/\*\//g, "* /").trim();
}

function quoted(value: string) {
  return JSON.stringify(value);
}

function gherkinSteps(gherkin: string) {
  return gherkin.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^(Given|When|Then|And|Dado|Quando|Então|E)\b/i.test(line));
}

/** Produces a safe Playwright skeleton without inventing technical application details. */
export class DeterministicPlaywrightGenerator implements PlaywrightGenerator {
  readonly name = "deterministic-playwright";

  async generate({ testCase }: PlaywrightGenerationInput) {
    const testName = `${testCase.id} — ${testCase.title}`;
    const suppliedData = testCase.testData && testCase.testData !== "N/A";
    const steps = gherkinSteps(testCase.gherkin).length ? gherkinSteps(testCase.gherkin) : testCase.steps;
    const stepComments = steps.map((step) => `    // ${asComment(step)}`).join("\n");
    const testData = suppliedData ? `const testData = { value: ${quoted(testCase.testData!)} };` : "// TODO: The approved test case does not define concrete test data.";
    const fill = suppliedData ? 'await page.getByRole("textbox", { name: "YOUR_FIELD_NAME" }).fill(testData.value);' : "// TODO: Replace with the requirement-defined interaction and locator.";

    return {
      generator: this.name,
      code: `import { expect, test } from "@playwright/test";

const BASE_URL = "https://YOUR-APPLICATION-URL";

test.describe(${quoted(testCase.title)}, () => {
  test(${quoted(testName)}, async ({ page }) => {
    // TODO: The approved test case does not define the application URL or route.
    await page.goto(BASE_URL);

    ${testData}

    // Requirement-approved steps:
${stepComments || "    // TODO: The approved test case does not define executable steps."}

    // TODO: Replace placeholder locators with real accessible locators.
    ${fill}
    await page.getByRole("button", { name: "YOUR_BUTTON_NAME" }).click();

    // Expected result: ${asComment(testCase.expectedBehavior)}
    // TODO: Define an assertion with the real observable result from the application.
    await expect(page.getByText("YOUR_EXPECTED_RESULT")).toBeVisible();
  });
});
`,
    };
  }
}
