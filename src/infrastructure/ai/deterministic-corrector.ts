import type { CorrectorInput, CorrectorProvider, CorrectorResult } from "../../domain/ai/corrector-provider";
import type { RequirementAnalysis } from "../../schemas/analysis";
import { analysisResultSchema } from "../../schemas/analysis";
import type { ChangelogEntry } from "../../schemas/correction";
import type { QAIssue } from "../../schemas/review";

function cloneAnalysis(analysis: RequirementAnalysis): RequirementAnalysis {
  return analysisResultSchema.parse(JSON.parse(JSON.stringify(analysis)));
}

function gapPrefix(portuguese: boolean): string {
  return portuguese ? "Lacuna do requisito:" : "Requirement gap:";
}

function refreshCoverageSummary(analysis: RequirementAnalysis) {
  const scenarios = analysis.scenarios;
  const scenarioText = (scenario: RequirementAnalysis["scenarios"][number]) =>
    [scenario.title, scenario.description, scenario.expectedBehavior, ...scenario.steps, scenario.gherkin].join(" ").toLowerCase();
  analysis.coverageSummary = {
    ...analysis.coverageSummary,
    totalTestCases: scenarios.length,
    happyPathCases: scenarios.filter((scenario) => scenario.category === "POSITIVE").length,
    negativeCases: scenarios.filter((scenario) => scenario.category === "NEGATIVE").length,
    edgeCases: scenarios.filter((scenario) => scenario.category === "BOUNDARY").length,
    validationCases: scenarios.filter((scenario) => /valid|invalid|validation|format|limit|boundary|obrigat|válid|inválid|formato|limite/i.test(scenarioText(scenario))).length,
    integrationCases: scenarios.filter((scenario) => scenario.category === "INTEGRATION" || /integration|api|service|serviço|timeout/i.test(scenarioText(scenario))).length,
    authorizationCases: scenarios.filter((scenario) => scenario.category === "SECURITY" || /authoriz|permission|permiss|access|acesso/i.test(scenarioText(scenario))).length,
  };
}

export class DeterministicQACorrector implements CorrectorProvider {
  readonly name = "deterministic-corrector";

  async correctAnalysis({ input, originalAnalysis, review }: CorrectorInput): Promise<CorrectorResult> {
    const portuguese = input.locale === "pt";
    const gap = gapPrefix(portuguese);
    const next = cloneAnalysis(originalAnalysis);
    const changelog: ChangelogEntry[] = [];
    const originalScenarioCount = originalAnalysis.scenarios.length;
    const originalFacts = [...originalAnalysis.requirementFacts];

    const applyIssue = (issue: QAIssue) => {
      switch (issue.type) {
        case "GHERKIN_ERROR": {
          const target = next.scenarios.find((scenario) => scenario.id === issue.affectedTestCase);
          if (target && !/^(Feature|Funcionalidade)\b/m.test(target.gherkin)) {
            const header = portuguese ? "Funcionalidade: Requisito em análise\n\n" : "Feature: Requirement under analysis\n\n";
            target.gherkin = header + target.gherkin;
          }
          next.gherkin = next.gherkin.map((block) => {
            if (/^(Feature|Funcionalidade)\b/m.test(block.content)) return block;
            const header = portuguese ? "Funcionalidade: Requisito em análise\n\n" : "Feature: Requirement under analysis\n\n";
            return { ...block, content: header + block.content };
          });
          changelog.push({ issueId: issue.id, type: issue.type, action: "FIXED", summary: "Gherkin header added without changing expected rules." });
          break;
        }
        case "WEAK_EXPECTED_RESULT": {
          const target = next.scenarios.find((scenario) => scenario.id === issue.affectedTestCase);
          if (target) {
            const fact = next.requirementFacts[0];
            target.expectedBehavior = fact
              ? `${target.expectedBehavior} ${portuguese ? "Baseado no fato do requisito:" : "Based on requirement fact:"} ${fact}`
              : `${target.expectedBehavior} ${gap} ${portuguese ? "o comportamento exato de sucesso/falha não está no requisito original." : "the exact pass/fail behavior is not in the original requirement."}`;
          }
          changelog.push({ issueId: issue.id, type: issue.type, action: "FIXED", summary: "Expected result strengthened without inventing a rule." });
          break;
        }
        case "MISSING_PRECONDITION": {
          const target = next.scenarios.find((scenario) => scenario.id === issue.affectedTestCase);
          if (target && target.prerequisites.length === 0) {
            target.prerequisites.push(
              portuguese
                ? `${gap} pré-condição não especificada no requisito original.`
                : `${gap} precondition not specified in the original requirement.`,
            );
          } else if (target) {
            target.prerequisites.push(
              portuguese ? "Ator identificado no requisito está disponível." : "Actor identified in the requirement is available.",
            );
          }
          changelog.push({ issueId: issue.id, type: issue.type, action: "FIXED", summary: "Precondition added or marked as a requirement gap." });
          break;
        }
        case "MISSING_TEST_DATA": {
          const target = next.scenarios.find((scenario) => scenario.id === issue.affectedTestCase);
          if (target && (!target.testData || target.testData === "N/A")) {
            target.testData = portuguese
              ? `${gap} dados de teste concretos não foram definidos no requisito.`
              : `${gap} concrete test data was not defined in the requirement.`;
          }
          changelog.push({ issueId: issue.id, type: issue.type, action: "FIXED", summary: "Test data marked as a gap instead of inventing values." });
          break;
        }
        case "MISSING_SCENARIO":
        case "INSUFFICIENT_COVERAGE": {
          const alreadyAdded = next.scenarios.some((scenario) => scenario.id === "TC-GAP-001");
          if (!alreadyAdded) {
            next.scenarios.push({
              id: "TC-GAP-001",
              title: portuguese ? "Cobrir cenário ausente sem inventar regra" : "Cover missing scenario without inventing a rule",
              type: "Functional",
              category: "NEGATIVE",
              description: review.missingScenarios[0] || issue.description,
              prerequisites: [
                portuguese
                  ? `${gap} pré-condições deste cenário não foram definidas no requisito.`
                  : `${gap} preconditions for this scenario were not defined in the requirement.`,
              ],
              testData: portuguese ? `${gap} dados não especificados.` : `${gap} data not specified.`,
              steps: [
                portuguese ? "Preparar o contexto descrito no requisito." : "Prepare the context described in the requirement.",
                portuguese ? "Executar a ação descrita." : "Execute the described action.",
                portuguese ? "Observar o resultado e registrar a lacuna se o esperado não estiver no requisito." : "Observe the result and record the gap if the expected outcome is not in the requirement.",
              ],
              gherkin: portuguese
                ? "Funcionalidade: Cobertura complementar\n\nCenário: Cenário ausente identificado pelo Judge\n  Dado que o requisito original é a fonte da verdade\n  Quando a ação descrita é executada\n  Então o resultado deve ser validado apenas com o que o requisito define\n  E lacunas devem ser registradas em vez de regras inventadas"
                : "Feature: Complementary coverage\n\nScenario: Missing scenario identified by the Judge\n  Given the original requirement is the source of truth\n  When the described action is executed\n  Then the outcome must be validated only against what the requirement defines\n  And gaps must be recorded instead of invented rules",
              priority: "HIGH",
              expectedBehavior: portuguese
                ? `${gap} o resultado esperado deste cenário não está explícito no requisito original.`
                : `${gap} the expected outcome of this scenario is not explicit in the original requirement.`,
              automation: "MANUAL",
            });
          }
          changelog.push({ issueId: issue.id, type: issue.type, action: "FIXED", summary: "Coverage gap addressed without inventing business rules." });
          break;
        }
        case "INVENTED_RULE": {
          const invented = review.potentiallyInventedRules.find((rule) => issue.description.includes(rule)) || review.potentiallyInventedRules[0];
          if (invented) {
            next.businessRules = next.businessRules.filter((rule) => rule !== invented);
            next.ambiguities.push({
              term: invented.slice(0, 80),
              problem: portuguese
                ? "Regra potencialmente inventada: não consta no requisito original."
                : "Potentially invented rule: not present in the original requirement.",
              requiredInformation: portuguese
                ? "Confirmar com o PO se esta regra existe."
                : "Confirm with the PO whether this rule exists.",
              questionForPo: portuguese
                ? `A regra "${invented}" faz parte do requisito?`
                : `Is the rule "${invented}" part of the requirement?`,
            });
          }
          changelog.push({ issueId: issue.id, type: issue.type, action: "MARKED_AS_AMBIGUITY", summary: "Invented rule removed from facts and marked as ambiguity." });
          break;
        }
        case "CONTRADICTION": {
          if (!next.contradictions.includes(issue.description)) {
            next.contradictions.push(issue.description);
          }
          changelog.push({ issueId: issue.id, type: issue.type, action: "FIXED", summary: "Contradiction recorded against the original requirement." });
          break;
        }
        case "REDUNDANT_TEST": {
          changelog.push({ issueId: issue.id, type: issue.type, action: "SKIPPED", summary: "Redundant tests were kept to avoid destructive edits." });
          break;
        }
        case "INVALID_SCENARIO": {
          const target = next.scenarios.find((scenario) => scenario.id === issue.affectedTestCase);
          if (target) {
            target.expectedBehavior = `${gap} ${portuguese ? "cenário marcado como inválido até confirmação do PO." : "scenario marked invalid until the PO confirms it."}`;
          }
          changelog.push({ issueId: issue.id, type: issue.type, action: "FIXED", summary: "Invalid scenario marked as a gap instead of inventing a replacement rule." });
          break;
        }
        default: {
          changelog.push({ issueId: issue.id, type: issue.type, action: "SKIPPED", summary: "No conservative fix available." });
        }
      }
    };

    for (const issue of review.issues) {
      applyIssue(issue);
    }

    if (next.scenarios.length < originalScenarioCount) {
      next.scenarios = originalAnalysis.scenarios;
    }
    next.requirementFacts = originalFacts;
    refreshCoverageSummary(next);

    return { analysis: analysisResultSchema.parse(next), changelog };
  }
}
