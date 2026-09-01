import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeAnalysis } from "../helpers/qa-fixtures";

const repository = vi.hoisted(() => ({ getAnalysisForExport: vi.fn() }));
vi.mock("../../src/infrastructure/persistence/analysis-repository", () => repository);
import { GET } from "../../src/app/api/analyses/[id]/export/route";

const context = { params: Promise.resolve({ id: "a1" }) };
describe("GET /api/analyses/[id]/export", () => {
  beforeEach(() => { vi.clearAllMocks(); repository.getAnalysisForExport.mockResolvedValue({ id: "a1", requirement: "Registered customers can request a password recovery email.", additionalContext: "", createdAt: "2026-01-01T00:00:00.000Z", project: null, result: makeAnalysis() }); });
  it("downloads persisted analysis as Markdown", async () => {
    const response = await GET(new Request("http://localhost/api/analyses/a1/export?format=markdown"), context);
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toContain("text/markdown"); expect(await response.text()).toContain("## Test Cases");
  });
  it("downloads persisted analysis as PDF", async () => {
    const response = await GET(new Request("http://localhost/api/analyses/a1/export?format=pdf"), context);
    expect(response.status).toBe(200); expect(response.headers.get("content-type")).toContain("application/pdf"); expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);
  });
  it("reports invalid formats and absent persisted analyses", async () => {
    expect((await GET(new Request("http://localhost/api/analyses/a1/export?format=csv"), context)).status).toBe(400);
    repository.getAnalysisForExport.mockResolvedValueOnce(null);
    expect((await GET(new Request("http://localhost/api/analyses/a1/export?format=markdown"), context)).status).toBe(404);
  });
});
