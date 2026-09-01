import ts from "typescript";

const MAX_CODE_LENGTH = 40_000;
const secretPattern = /(?:api[_-]?key|authorization|bearer|password|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i;

export class PlaywrightCodeValidationError extends Error {}

export function validatePlaywrightCode(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new PlaywrightCodeValidationError("Generated Playwright code is empty.");
  }
  const code = value.trim();
  if (code.length > MAX_CODE_LENGTH) {
    throw new PlaywrightCodeValidationError("Generated Playwright code exceeds the allowed size.");
  }
  if (/```/.test(code)) {
    throw new PlaywrightCodeValidationError("Generated Playwright code must not include Markdown fences.");
  }
  if (!/from\s+["']@playwright\/test["']/.test(code) || !/test\.describe\s*\(/.test(code) || !/\btest\s*\(/.test(code)) {
    throw new PlaywrightCodeValidationError("Generated code is missing the required Playwright test structure.");
  }
  if (secretPattern.test(code)) {
    throw new PlaywrightCodeValidationError("Generated Playwright code contains a possible secret or credential.");
  }
  const diagnostics = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2024 },
    reportDiagnostics: true,
  }).diagnostics ?? [];
  if (diagnostics.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) {
    throw new PlaywrightCodeValidationError("Generated Playwright code is not valid TypeScript.");
  }
  return code;
}
