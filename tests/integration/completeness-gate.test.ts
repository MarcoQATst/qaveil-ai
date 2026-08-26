import { describe, expect, it } from "vitest";
import { GeminiAIProvider } from "../../src/infrastructure/ai/gemini-provider";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const apiKey = process.env.GEMINI_API_KEY;

describe("Requirement Completeness Gate", () => {
  const runTest = apiKey ? it : it.skip;

  runTest("TESTE A — requisito completo", async () => {
    const provider = new GeminiAIProvider(apiKey);
    const result = await provider.analyzeRequirement({
      locale: "pt",
      userStory: "Como usuário autenticado, quero alterar minha senha de acesso.",
      requirement: "O usuário altera a senha informando a senha atual de 8 a 20 caracteres e a nova senha que deve ser confirmada. O sistema valida se a senha atual está correta, se a nova senha atende aos requisitos de complexidade (mínimo de 8 caracteres, contendo 1 letra maiúscula, 1 número e 1 caractere especial), e se a confirmação confere. Caso as validações passem, a senha é criptografada e salva, e o usuário recebe feedback de sucesso. Caso contrário, mensagens de erro específicas para cada falha são mostradas.",
      acceptanceCriteria: "1. Senha atual validada contra hash do banco.\n2. Requisitos de complexidade obrigatórios para a nova senha.\n3. Bloqueio após 3 tentativas inválidas consecutivas com reset após 15 minutos.",
    });

    expect(["ACCEPTABLE", "GOOD", "EXCELLENT"]).toContain(result.completeness.status);
    expect(result.completeness.score).toBeGreaterThanOrEqual(60);
    expect(result.scenarios.length).toBeGreaterThanOrEqual(5);
    expect(result.requirementFacts.length).toBeGreaterThan(0);
  }, 90000);

  runTest("TESTE B — requisito vago", async () => {
    const provider = new GeminiAIProvider(apiKey);
    const result = await provider.analyzeRequirement({
      locale: "pt",
      requirement: "O sistema deve funcionar corretamente e ser rápido.",
    });

    expect(["INCOMPLETE", "WEAK"]).toContain(result.completeness.status);
    expect(result.completeness.score).toBeLessThan(60);
    expect(result.ambiguities.length).toBeGreaterThan(0);
    expect(result.requirementGaps.length).toBeGreaterThan(0);
  }, 90000);

  runTest("TESTE C — requisito parcialmente especificado", async () => {
    const provider = new GeminiAIProvider(apiKey);
    const result = await provider.analyzeRequirement({
      locale: "pt",
      requirement: "O usuário pode alterar a senha informando a senha atual e uma nova senha.",
    });

    expect(["INCOMPLETE", "WEAK", "ACCEPTABLE"]).toContain(result.completeness.status);
    expect(result.completeness.score).toBeLessThan(80);
    expect(result.requirementGaps.length).toBeGreaterThan(0);
  }, 90000);

  runTest("TESTE D — requisito propositalmente ruim", async () => {
    const provider = new GeminiAIProvider(apiKey);
    const result = await provider.analyzeRequirement({
      locale: "pt",
      requirement: "O sistema deve permitir que usuários façam pagamentos rapidamente. O pagamento deve ser seguro e funcionar corretamente mesmo quando houver muitos usuários. Quando houver algum problema, o sistema deve informar o usuário. O pagamento não deve ser processado duas vezes.",
    });

    expect(["INCOMPLETE", "WEAK", "ACCEPTABLE"]).toContain(result.completeness.status);
    expect(result.completeness.score).toBeLessThan(80);

    // Check that rationale, ambiguities, or gaps highlight vague terms
    const ambiguityTerms = result.ambiguities.map(a => a.term.toLowerCase()).join(" ");
    const textToCheck = [
      result.completeness.rationale,
      ambiguityTerms,
      ...result.requirementGaps,
      ...result.missingInformation
    ].join(" ").toLowerCase();

    expect(textToCheck).toMatch(/(rápido|rapidamente|seguro|muitos|problema)/);
  }, 90000);
});
