import type { JudgeProvider } from "../../domain/ai/judge-provider";
import type { RequirementAnalysis, RequirementInput } from "../../schemas/analysis";
import type { QAIssue, QAReview } from "../../schemas/review";

function sourceText(input: RequirementInput): string {
  return [input.userStory, input.requirement, input.acceptanceCriteria, input.additionalContext]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function computeScore(issues: QAIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "CRITICAL") score -= 15;
    else if (issue.severity === "HIGH") score -= 8;
    else if (issue.severity === "MEDIUM") score -= 4;
    else score -= 2;
  }
  return Math.max(0, Math.min(100, score));
}

function meaningfulWords(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)?.filter((word) => ![
    "that", "with", "from", "only", "when", "will", "must", "should", "system", "creates", "create", "after", "request", "recovery", "para", "como", "deve", "apenas", "quando", "seja", "uma", "umas", "este", "esta", "sistema", "cria", "criar", "após", "depois", "solicitação", "recuperação",
  ].includes(word)) ?? [];
}

function isCoveredByScenario(behavior: string, analysis: RequirementAnalysis): boolean {
  const keywords = meaningfulWords(behavior);
  if (!keywords.length) return true;
  return analysis.scenarios.some((scenario) => {
    const text = [scenario.title, scenario.description, scenario.expectedBehavior, scenario.testData, ...scenario.steps, scenario.gherkin]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matches = keywords.filter((keyword) => text.includes(keyword)).length;
    return matches >= Math.min(2, keywords.length);
  });
}

export class DeterministicQAJudge implements JudgeProvider {
  readonly name = "deterministic-judge";

  async reviewAnalysis(input: RequirementInput, analysis: RequirementAnalysis): Promise<QAReview> {
    const portuguese = input.locale === "pt";
    const source = sourceText(input);
    const issues: QAIssue[] = [];
    const missingScenarios: string[] = [];
    const potentiallyInventedRules: string[] = [];
    const gherkinIssues: string[] = [];
    let issueIndex = 1;
    const nextId = () => `ISSUE-${String(issueIndex++).padStart(3, "0")}`;

    for (const rule of analysis.businessRules) {
      const needle = rule.toLowerCase().slice(0, 40);
      const looksInvented =
        !source.includes(needle) &&
        !/lacuna|gap|não defini|not defin|precisa|must be defined/i.test(rule);
      if (looksInvented && rule.length > 20) {
        potentiallyInventedRules.push(rule);
        issues.push({
          id: nextId(),
          type: "INVENTED_RULE",
          severity: "HIGH",
          description: portuguese
            ? `Regra de negócio não encontrada no requisito original: ${rule}`
            : `Business rule not found in the original requirement: ${rule}`,
          recommendedAction: portuguese
            ? "Remover da lista de regras e tratar como ambiguidade ou informação ausente."
            : "Remove from business rules and treat as an ambiguity or missing information.",
        });
      }
    }

    for (const scenario of analysis.scenarios) {
      const gherkin = scenario.gherkin || "";
      const hasFeature = /^(Feature|Funcionalidade)\b/m.test(gherkin);
      if (!hasFeature) {
        gherkinIssues.push(scenario.id);
        issues.push({
          id: nextId(),
          type: "GHERKIN_ERROR",
          severity: "MEDIUM",
          description: portuguese
            ? `Gherkin de ${scenario.id} não inicia com Funcionalidade.`
            : `Gherkin for ${scenario.id} does not start with Feature.`,
          affectedTestCase: scenario.id,
          recommendedAction: portuguese
            ? "Adicionar o cabeçalho Funcionalidade sem inventar regras."
            : "Add a Feature header without inventing rules.",
        });
      }

      if (!scenario.expectedBehavior || scenario.expectedBehavior.trim().length < 40) {
        issues.push({
          id: nextId(),
          type: "WEAK_EXPECTED_RESULT",
          severity: "HIGH",
          description: portuguese
            ? `Resultado esperado fraco ou genérico em ${scenario.id}.`
            : `Weak or generic expected result in ${scenario.id}.`,
          affectedTestCase: scenario.id,
          recommendedAction: portuguese
            ? "Detalhar o resultado com fatos do requisito ou marcar como lacuna."
            : "Detail the result using requirement facts or mark it as a gap.",
        });
      }

      if (!scenario.prerequisites.length) {
        issues.push({
          id: nextId(),
          type: "MISSING_PRECONDITION",
          severity: "MEDIUM",
          description: portuguese
            ? `Pré-condições ausentes em ${scenario.id}.`
            : `Missing preconditions in ${scenario.id}.`,
          affectedTestCase: scenario.id,
          recommendedAction: portuguese
            ? "Adicionar pré-condições explícitas ou indicar que o requisito não as define."
            : "Add explicit preconditions or state that the requirement does not define them.",
        });
      }

      if (!scenario.testData || scenario.testData === "N/A") {
        issues.push({
          id: nextId(),
          type: "MISSING_TEST_DATA",
          severity: "LOW",
          description: portuguese
            ? `Dados de teste ausentes em ${scenario.id}.`
            : `Missing test data in ${scenario.id}.`,
          affectedTestCase: scenario.id,
          recommendedAction: portuguese
            ? "Incluir dados derivados do requisito ou marcar como lacuna."
            : "Include data derived from the requirement or mark as a gap.",
        });
      }
    }

    const categories = new Set(analysis.scenarios.map((scenario) => scenario.category));
    if (!categories.has("NEGATIVE")) {
      missingScenarios.push(portuguese ? "Cenário negativo explícito" : "Explicit negative scenario");
      issues.push({
        id: nextId(),
        type: "MISSING_SCENARIO",
        severity: "HIGH",
        description: portuguese
          ? "A análise não possui um cenário negativo explícito."
          : "The analysis has no explicit negative scenario.",
        recommendedAction: portuguese
          ? "Adicionar um cenário negativo baseado apenas no que o requisito permite testar."
          : "Add a negative scenario based only on what the requirement allows testing.",
      });
    }

    if (analysis.coverageSummary.totalTestCases !== analysis.scenarios.length) {
      issues.push({
        id: nextId(),
        type: "INSUFFICIENT_COVERAGE",
        severity: "MEDIUM",
        description: portuguese
          ? "coverageSummary.totalTestCases não corresponde à quantidade de Test Cases gerados."
          : "coverageSummary.totalTestCases does not match the generated Test Case count.",
        recommendedAction: portuguese
          ? "Recalcular o resumo de cobertura a partir dos cenários finais."
          : "Recalculate the coverage summary from the final scenarios.",
      });
    }

    const explicitBehaviors = [...analysis.requirementFacts, ...analysis.businessRules]
      .filter((behavior, index, items) => items.indexOf(behavior) === index)
      .filter((behavior) => !/lacuna|gap|não defini|not defin/i.test(behavior));
    for (const behavior of explicitBehaviors) {
      const listedAsUncovered = analysis.coverageSummary.uncoveredAreas.some((area) => area.toLowerCase().includes(behavior.toLowerCase()));
      if (!isCoveredByScenario(behavior, analysis) && !listedAsUncovered) {
        missingScenarios.push(behavior);
        issues.push({
          id: nextId(),
          type: "INSUFFICIENT_COVERAGE",
          severity: "HIGH",
          description: portuguese
            ? `Comportamento explícito sem Test Case correspondente: ${behavior}`
            : `Explicit behavior has no corresponding Test Case: ${behavior}`,
          recommendedAction: portuguese
            ? "Criar um cenário específico para este comportamento ou registrar a informação ausente que impede um resultado objetivo."
            : "Create a specific scenario for this behavior or record the missing information that prevents an objective result.",
        });
      }
    }

    for (const conflict of input.projectContext?.regressionImpact.potentialRequirementConflicts ?? []) {
      issues.push({
        id: nextId(), type: "CONTRADICTION", severity: "HIGH", description: conflict,
        recommendedAction: portuguese ? "Confirmar com o Product Owner se a regra do projeto será alterada." : "Confirm with the Product Owner whether the project rule is changing.",
      });
    }

    const score = computeScore(issues);
    const strengths = [
      portuguese ? "Estrutura de análise QA preservada." : "QA analysis structure is preserved.",
    ];

    return {
      score,
      overallAssessment: portuguese
        ? `Avaliação determinística da análise. Score ${score}/100 com ${issues.length} problema(s).`
        : `Deterministic review of the analysis. Score ${score}/100 with ${issues.length} issue(s).`,
      strengths,
      issues,
      missingScenarios,
      potentiallyInventedRules,
      gherkinIssues,
      coverageAssessment: portuguese
        ? `${analysis.coverageSummary.totalTestCases} Test Case(s): ${analysis.coverageSummary.happyPathCases} happy path, ${analysis.coverageSummary.negativeCases} negativo(s); ${analysis.coverageSummary.uncoveredAreas.length} área(s) descoberta(s) por lacuna.`
        : `${analysis.coverageSummary.totalTestCases} test case(s): ${analysis.coverageSummary.happyPathCases} happy path, ${analysis.coverageSummary.negativeCases} negative; ${analysis.coverageSummary.uncoveredAreas.length} area(s) uncovered due to gaps.`,
      recommendations: issues.slice(0, 5).map((issue) => issue.recommendedAction),
    };
  }
}
