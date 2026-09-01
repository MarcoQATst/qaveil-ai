import { describe, expect, it } from "vitest";
import { ProjectContextBuilder } from "../../src/application/project-context-builder";

const project = { id: "project-a", name: "Portal", description: "Portal do cliente", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const entries = [
  { id: "rule", projectId: "project-a", type: "BUSINESS_RULE" as const, title: "BR-001", content: "O plano Basic permite no máximo 5 Cares.", source: "MANUAL" },
  { id: "doc", projectId: "project-a", type: "DOCUMENTATION" as const, title: "Plano Basic", content: "A tela de planos mostra Cares e o plano Basic.", source: "DOCUMENT_UPLOAD" },
  { id: "other-project", projectId: "project-b", type: "BUSINESS_RULE" as const, title: "Segredo", content: "Nunca deve aparecer.", source: "MANUAL" },
];

describe("ProjectContextBuilder", () => {
  it("selects relevant entries, labels provenance, and keeps project isolation", () => {
    const result = new ProjectContextBuilder().build(project, entries, { requirement: "Alterar o plano Basic para permitir 10 Cares.", additionalContext: "" });
    expect(result.entries.map((entry) => entry.id)).toEqual(["rule", "doc"]);
    expect(result.promptContext).toContain("[REQUISITO ATUAL]");
    expect(result.promptContext).toContain("[REGRA CONFIRMADA DO PROJETO]");
    expect(result.promptContext).toContain("[DOCUMENTAÇÃO DO PROJETO]");
    expect(result.promptContext).not.toContain("Segredo");
    expect(result.regressionImpact.potentialRequirementConflicts[0]).toContain("POTENTIAL_REQUIREMENT_CONFLICT");
  });

  it("does not inject unrelated project knowledge", () => {
    const result = new ProjectContextBuilder().build(project, entries, { requirement: "Atualizar endereço de entrega.", additionalContext: "" });
    expect(result.entries).toEqual([]);
    expect(result.promptContext).not.toContain("Plano Basic");
  });
});
