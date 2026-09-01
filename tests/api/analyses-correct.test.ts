import { describe, expect, it } from "vitest";
import { POST as POST_ANALYZE } from "../../src/app/api/analyses/route";
import { POST as POST_CORRECT } from "../../src/app/api/analyses/correct/route";

describe("POST /api/analyses/correct", () => {
  it("runs auto-correction from a previous analysis without using the browser", async () => {
    const analyze = await POST_ANALYZE(new Request("http://localhost/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "en",
        requirement: "The system sends a recovery email when a registered customer requests a password reset.",
      }),
    }));
    const analyzed = await analyze.json();
    expect(analyze.status).toBe(200);
    expect(analyzed.review).toBeDefined();
    expect(analyzed.review.issues.length).toBeGreaterThan(0);

    const correct = await POST_CORRECT(new Request("http://localhost/api/analyses/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: "en",
        requirement: "The system sends a recovery email when a registered customer requests a password reset.",
        analysis: analyzed.originalAnalysis ?? analyzed.analysis,
        review: analyzed.review,
      }),
    }));
    const body = await correct.json();
    expect(correct.status).toBe(200);
    expect(body.correction).toBeDefined();
    expect(body.initialReview.score).toBe(analyzed.review.score);
    expect(body.finalReview).toBeDefined();
    expect(body.originalAnalysis.summary).toBe(analyzed.analysis.summary);
  });
});
