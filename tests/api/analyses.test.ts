import { describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/analyses/route";

describe("POST /api/analyses", () => {
  it("returns a validated analysis response", async () => {
    const response = await POST(new Request("http://localhost/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "pt", requirement: "Como cliente, quero alterar meu endereço de entrega antes que o pedido seja despachado." }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.analysis.risk.score).toBeGreaterThan(0);
    expect(body.analysis.scenarios.length).toBeGreaterThanOrEqual(5);
    expect(body.analysis.scenarios.some((scenario: { category: string }) => scenario.category === "SECURITY")).toBe(true);
  });

  it("rejects a too-short requirement", async () => {
    const response = await POST(new Request("http://localhost/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirement: "Short" }),
    }));
    expect(response.status).toBe(400);
  });
});
