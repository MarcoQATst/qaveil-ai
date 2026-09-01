import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  createProject: vi.fn(), listProjects: vi.fn(), getProject: vi.fn(), updateProject: vi.fn(), listProjectContext: vi.fn(), addProjectContext: vi.fn(),
}));
vi.mock("../../src/infrastructure/persistence/project-repository", () => repository);

import { GET as list, POST as create } from "../../src/app/api/projects/route";
import { PATCH as update } from "../../src/app/api/projects/[id]/route";
import { GET as listContext, POST as addContext } from "../../src/app/api/projects/[id]/context/route";

const project = { id: "p1", name: "Portal", description: "Portal", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const context = { id: "c1", projectId: "p1", type: "BUSINESS_RULE", title: "BR-001", content: "Máximo 5 Cares", source: "MANUAL" };
const params = { params: Promise.resolve({ id: "p1" }) };

describe("project APIs", () => {
  beforeEach(() => { vi.clearAllMocks(); repository.listProjects.mockResolvedValue([project]); repository.createProject.mockResolvedValue(project); repository.getProject.mockResolvedValue(project); repository.updateProject.mockResolvedValue({ ...project, name: "Portal atualizado" }); repository.listProjectContext.mockResolvedValue([context]); repository.addProjectContext.mockResolvedValue(context); });
  it("creates, lists and edits projects", async () => {
    expect((await list()).status).toBe(200);
    expect((await (await list()).json()).projects).toEqual([project]);
    expect((await create(new Request("http://localhost/api/projects", { method: "POST", body: JSON.stringify({ name: "Portal" }) }))).status).toBe(201);
    const response = await update(new Request("http://localhost/api/projects/p1", { method: "PATCH", body: JSON.stringify({ name: "Portal atualizado" }) }), params);
    expect(response.status).toBe(200); expect(repository.updateProject).toHaveBeenCalledWith("p1", { name: "Portal atualizado" });
  });
  it("stores confirmed business context and rejects invalid requests", async () => {
    const response = await addContext(new Request("http://localhost/api/projects/p1/context", { method: "POST", body: JSON.stringify({ type: "BUSINESS_RULE", title: "BR-001", content: "Máximo 5 Cares", source: "MANUAL" }) }), params);
    expect(response.status).toBe(201); expect(repository.addProjectContext).toHaveBeenCalledWith("p1", expect.objectContaining({ type: "BUSINESS_RULE" }));
    const invalid = await create(new Request("http://localhost/api/projects", { method: "POST", body: JSON.stringify({ name: "" }) })); expect(invalid.status).toBe(400);
  });
  it("lists only the selected project context and returns 404 for missing projects", async () => {
    expect((await listContext(new Request("http://localhost"), params)).status).toBe(200);
    expect(repository.listProjectContext).toHaveBeenCalledWith("p1");
    repository.getProject.mockResolvedValueOnce(null);
    expect((await listContext(new Request("http://localhost"), params)).status).toBe(404);
  });
  it("does not disguise database failures as an empty persisted list or a successful create", async () => {
    repository.listProjects.mockRejectedValueOnce(new Error("P1001"));
    const unavailableList = await list();
    expect(unavailableList.status).toBe(503);
    expect((await unavailableList.json()).error).toContain("database connection");
    repository.createProject.mockRejectedValueOnce(new Error("P1001"));
    const unavailableCreate = await create(new Request("http://localhost/api/projects", { method: "POST", body: JSON.stringify({ name: "Portal" }) }));
    expect(unavailableCreate.status).toBe(503);
  });
});
