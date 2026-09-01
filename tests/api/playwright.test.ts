import { describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/playwright/route";
import { makeAnalysis } from "../helpers/qa-fixtures";

describe("POST /api/playwright", () => {
  it("generates code for one final test case", async () => {
    const response = await POST(new Request("http://localhost/api/playwright", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "en", requirement: "A registered customer can request password recovery.", testCase: makeAnalysis().scenarios[0] }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.generator).toBe("deterministic-playwright");
    expect(body.code).toContain("test.describe(");
  });

  it("returns a client error when the final test case is missing", async () => {
    const response = await POST(new Request("http://localhost/api/playwright", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "A final test case is required to generate Playwright code.",
    });
  });

  it("returns a client error when the requirement context is missing", async () => {
    const response = await POST(new Request("http://localhost/api/playwright", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testCase: makeAnalysis().scenarios[0] }),
    }));

    expect(response.status).toBe(400);
  });
});
