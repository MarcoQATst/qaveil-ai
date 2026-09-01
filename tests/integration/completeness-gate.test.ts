import { describe, expect, it, vi } from "vitest";
import { analyzeRequirement } from "../../src/application/analyze-requirement";
import type { AIProvider } from "../../src/domain/ai/provider";
import type { RequirementAnalysis, RequirementInput } from "../../src/schemas/analysis";
import { makeAnalysis } from "../helpers/qa-fixtures";

class StubAnalyst implements AIProvider {
  readonly name = "stub-analyst";
  readonly analyzeRequirement = vi.fn(async (_input: RequirementInput) => this.result);

  constructor(private readonly result: RequirementAnalysis) {}
}

describe("Requirement Completeness Gate (mocked provider)", () => {
  it("TESTE A — aceita um requisito completo sem depender de API externa", async () => {
    const provider = new StubAnalyst(makeAnalysis({
      completeness: { status: "GOOD", score: 88, rationale: "Acceptance criteria define the relevant behavior." },
      scenarios: Array.from({ length: 5 }, (_, index) => ({ ...makeAnalysis().scenarios[0], id: `TC-${String(index + 1).padStart(3, "0")}` })),
      coverageSummary: { ...makeAnalysis().coverageSummary, totalTestCases: 5 },
    }));
    const result = await analyzeRequirement(provider, {
      locale: "pt",
      requirement: "O usuário altera a senha atual por uma nova, confirmada e validada conforme critérios de aceite definidos.",
    });

    expect(provider.analyzeRequirement).toHaveBeenCalledTimes(1);
    expect(["ACCEPTABLE", "GOOD", "EXCELLENT"]).toContain(result.completeness.status);
    expect(result.completeness.score).toBeGreaterThanOrEqual(60);
    expect(result.scenarios).toHaveLength(5);
    expect(result.requirementFacts.length).toBeGreaterThan(0);
  });

  it("TESTE B — expõe ambiguidades de um requisito vago", async () => {
    const provider = new StubAnalyst(makeAnalysis({
      completeness: { status: "WEAK", score: 35, rationale: "The expected behavior is vague." },
      ambiguities: [{ term: "rápido", problem: "Sem métrica.", requiredInformation: "Definir tempo máximo.", questionForPo: "Qual o tempo máximo?" }],
      requirementGaps: ["Lacuna do requisito: critérios de sucesso não definidos."],
    }));
    const result = await analyzeRequirement(provider, { locale: "pt", requirement: "O sistema deve funcionar corretamente e ser rápido." });

    expect(["INCOMPLETE", "WEAK"]).toContain(result.completeness.status);
    expect(result.completeness.score).toBeLessThan(60);
    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(result.requirementGaps.length).toBeGreaterThan(0);
  });

  it("TESTE C — registra lacunas em um requisito parcialmente especificado", async () => {
    const provider = new StubAnalyst(makeAnalysis({
      completeness: { status: "ACCEPTABLE", score: 65, rationale: "The flow is present but validation rules are missing." },
      requirementGaps: ["Lacuna do requisito: regras de validação da nova senha não definidas."],
    }));
    const result = await analyzeRequirement(provider, { locale: "pt", requirement: "O usuário pode alterar a senha informando a senha atual e uma nova senha." });

    expect(["INCOMPLETE", "WEAK", "ACCEPTABLE"]).toContain(result.completeness.status);
    expect(result.completeness.score).toBeLessThan(80);
    expect(result.requirementGaps.length).toBeGreaterThan(0);
  });

  it("TESTE D — não transforma termos vagos em regras inventadas", async () => {
    const provider = new StubAnalyst(makeAnalysis({
      completeness: { status: "WEAK", score: 45, rationale: "Termos como rapidamente e seguro precisam de definição." },
      ambiguities: [{ term: "rapidamente", problem: "Sem métrica de desempenho.", requiredInformation: "Definir a meta.", questionForPo: "Qual é a meta?" }],
      missingInformation: ["Definição de seguro e comportamento quando houver problema."],
    }));
    const result = await analyzeRequirement(provider, {
      locale: "pt",
      requirement: "O sistema deve permitir pagamentos rapidamente, com segurança e sem processar duas vezes.",
    });

    expect(["INCOMPLETE", "WEAK", "ACCEPTABLE"]).toContain(result.completeness.status);
    const textToCheck = [
      result.completeness.rationale,
      ...result.ambiguities.map((ambiguity) => ambiguity.term),
      ...result.requirementGaps,
      ...result.missingInformation,
    ].join(" ").toLowerCase();
    expect(textToCheck).toMatch(/(rápido|rapidamente|seguro|muitos|problema)/);
  });
});
