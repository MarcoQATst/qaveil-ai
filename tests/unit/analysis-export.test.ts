import { describe, expect, it } from "vitest";
import { buildAnalysisMarkdown, buildAnalysisPdf } from "../../src/application/analysis-export";
import { makeAnalysis } from "../helpers/qa-fixtures";

describe("analysis export", () => {
  const record = { id: "analysis-1", requirement: "Registered customers can request a password recovery email.", additionalContext: "Email service is monitored.", createdAt: "2026-01-01T00:00:00.000Z", project: { name: "Portal" }, result: makeAnalysis({ contextSourcesUsed: [{ type: "BUSINESS_RULE", title: "BR-001", source: "MANUAL" }] }) };
  it("renders persisted analysis data as complete Markdown", () => {
    const markdown = buildAnalysisMarkdown(record);
    expect(markdown).toContain("## Requirement"); expect(markdown).toContain("## Project"); expect(markdown).toContain("Portal");
    expect(markdown).toContain("BR-001 (MANUAL)"); expect(markdown).toContain("## Regression Impact"); expect(markdown).toContain("### TC-001 - Registered customer requests recovery"); expect(markdown).toContain("```gherkin");
  });
  it("produces a valid PDF document without calling an AI provider", () => {
    const pdf = buildAnalysisPdf(record);
    expect(new TextDecoder().decode(pdf.slice(0, 8))).toBe("%PDF-1.4");
    expect(new TextDecoder().decode(pdf)).toContain("%%EOF");
  });
});
