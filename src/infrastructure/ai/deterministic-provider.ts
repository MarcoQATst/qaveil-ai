import type { AIProvider } from "../../domain/ai/provider";
import type { RequirementAnalysis, RequirementInput } from "../../schemas/analysis";
import { calculateRiskScore, classifyRisk } from "../../domain/qa/risk";

const actorPattern = /\b(?:as an?|as the)\s+([^,.]+?)(?=,|\s+i want|\s+i need|$)/i;

export class DeterministicAIProvider implements AIProvider {
  readonly name = "deterministic";

  async analyzeRequirement(input: RequirementInput): Promise<RequirementAnalysis> {
    const source = [input.userStory, input.requirement, input.acceptanceCriteria, input.additionalContext]
      .filter(Boolean)
      .join(" ");
    const actor = source.match(actorPattern)?.[1] ?? "User";
    const mentionsIntegration = /api|service|email|payment|shipping|webhook|integration/i.test(source);
    const mentionsAuth = /password|login|account|access|auth/i.test(source);
    const portuguese = input.locale === "pt";
    const mentionsOrder = /order|shipping|delivery|address|pedido|entrega|endereço/i.test(source);
    const score = calculateRiskScore({ impact: mentionsOrder || mentionsAuth ? 5 : 3, probability: mentionsIntegration ? 4 : 3, complexity: mentionsIntegration || mentionsOrder ? 4 : 2, detectability: 3 });
    const level = classifyRisk(score);

    return {
      summary: portuguese ? `O requisito solicita que ${actor} ${input.requirement.replace(/\.$/, "").toLowerCase()}.` : `The requirement asks ${actor} to ${input.requirement.replace(/\.$/, "").toLowerCase()}.`,
      actors: [actor],
      businessRules: input.acceptanceCriteria
        ? input.acceptanceCriteria.split(/\n|;/).map((item) => item.trim()).filter(Boolean)
        : [portuguese ? "O resultado esperado e as regras de validação precisam ser definidos." : "The expected business outcome and validation rules must be defined."],
      dependencies: mentionsIntegration ? [portuguese ? "Uma integração está implícita e precisa de um contrato para falhas." : "An external or internal integration is implied and needs a failure contract."] : [],
      preconditions: [portuguese ? "O ator possui a permissão e o estado de conta necessários para iniciar a ação." : "The actor has the required account state and permission to initiate the action."],
      postconditions: [portuguese ? "A alteração solicitada é persistida e visível na jornada relevante." : "The requested change is persisted and visible in the relevant user journey."],
      ambiguities: [portuguese ? "Os retornos de sucesso e erro não foram definidos explicitamente." : "Success and error feedback are not explicitly defined."],
      missingInformation: [
        portuguese ? "Regras de validação e valores de limite." : "Validation rules and boundary values.",
        portuguese ? "Comportamento esperado para retry, refresh e requisições concorrentes." : "Expected behavior for retries, refresh, and concurrent requests.",
        ...(mentionsAuth ? [portuguese ? "Requisitos de autenticação, autorização, expiração de token e auditoria." : "Authentication, authorization, token expiry, and audit requirements."] : []),
      ],
      questionsForPo: [
        portuguese ? "Quais condições exatas tornam esta ação bem-sucedida ou não?" : "What exact conditions make this action successful or unsuccessful?",
        portuguese ? "Quais mensagens de validação e ações de recuperação o usuário deve visualizar?" : "Which validation messages and recovery actions should the user see?",
        portuguese ? "O que acontece quando a solicitação é repetida ou processada concorrentemente?" : "What should happen when the request is retried or processed concurrently?",
        ...(mentionsIntegration ? [portuguese ? "Qual o comportamento esperado quando a integração está lenta, indisponível ou retorna dados inválidos?" : "What is the expected behavior when the integration is slow, unavailable, or returns invalid data?"] : []),
      ],
      risk: {
        score,
        level,
        rationale: portuguese ? "O score considera impacto no usuário, incertezas de regra e possíveis falhas de integração ou consistência de estado." : "The score considers user impact, rule uncertainty, and potential integration or state-consistency failures.",
        factors: [
          portuguese ? "Impacto no fluxo principal do usuário" : "Impact on the primary user flow",
          ...(mentionsIntegration ? [portuguese ? "Dependência de integração" : "Integration dependency"] : []),
          ...(mentionsOrder ? [portuguese ? "Alteração de estado sensível ao tempo" : "Time-sensitive state change"] : []),
        ],
      },
      hiddenRisks: [
        ...(mentionsOrder ? [{ risk: portuguese ? "Alteração concorrente do estado do pedido" : "Concurrent order-state change", whyItMatters: portuguese ? "O pedido pode ser despachado enquanto o endereço está sendo atualizado." : "The order may be dispatched while the address is being updated.", suggestedTest: portuguese ? "Simular atualização de endereço no mesmo momento em que o despacho é confirmado." : "Simulate an address update while dispatch is confirmed.", priority: "CRITICAL" as const }] : []),
        { risk: portuguese ? "Retry e duplicidade" : "Retry and duplication", whyItMatters: portuguese ? "Uma repetição pode produzir efeitos duplicados ou estado inconsistente." : "A retry may create duplicate effects or inconsistent state.", suggestedTest: portuguese ? "Reenviar a mesma solicitação e confirmar idempotência." : "Resend the same request and verify idempotency.", priority: "HIGH" as const },
        ...(mentionsIntegration ? [{ risk: portuguese ? "Timeout ou resposta inválida da integração" : "Integration timeout or invalid response", whyItMatters: portuguese ? "O fluxo precisa falhar de forma clara e recuperável." : "The flow must fail clearly and recoverably.", suggestedTest: portuguese ? "Simular timeout e payload inválido do serviço dependente." : "Simulate a timeout and invalid payload from the dependent service.", priority: "HIGH" as const }] : []),
        ...(mentionsAuth ? [{ risk: portuguese ? "Acesso não autorizado" : "Unauthorized access", whyItMatters: portuguese ? "Dados ou ações da conta não podem ser expostos a outro usuário." : "Account data or actions must not be exposed to another user.", suggestedTest: portuguese ? "Executar a ação com sessão expirada e com outro usuário autenticado." : "Attempt the action with an expired session and another authenticated user.", priority: "CRITICAL" as const }] : []),
      ],
      scenarios: [
        { id: "SC-001", title: portuguese ? "Executar o fluxo com dados válidos" : "Complete the flow with valid data", category: "POSITIVE", description: portuguese ? "Confirmar que o ator autorizado conclui a ação solicitada." : "Confirm that an authorized actor completes the requested action.", priority: "HIGH", expectedBehavior: portuguese ? "A alteração é persistida e uma confirmação clara é apresentada." : "The change is persisted and a clear confirmation is shown.", automation: "AUTOMATION_HIGHLY_RECOMMENDED" },
        { id: "SC-002", title: portuguese ? "Rejeitar dados inválidos" : "Reject invalid input", category: "NEGATIVE", description: portuguese ? "Enviar dados ausentes ou inválidos na requisição." : "Submit missing or invalid data in the request.", priority: "HIGH", expectedBehavior: portuguese ? "A validação impede a alteração e apresenta mensagem acionável." : "Validation prevents the change and shows an actionable message.", automation: "AUTOMATION_HIGHLY_RECOMMENDED" },
        { id: "SC-003", title: portuguese ? "Validar valores de limite" : "Validate boundary values", category: "BOUNDARY", description: portuguese ? "Testar os valores mínimo, máximo e imediatamente fora das regras." : "Test the minimum, maximum, and values immediately outside the rules.", priority: "MEDIUM", expectedBehavior: portuguese ? "Somente valores dentro do limite são aceitos." : "Only values within the boundary are accepted.", automation: "AUTOMATION_RECOMMENDED" },
        { id: "SC-004", title: portuguese ? "Bloquear acesso não autorizado" : "Block unauthorized access", category: "SECURITY", description: portuguese ? "Tentar a ação sem autenticação válida ou com usuário diferente." : "Attempt the action without valid authentication or as another user.", priority: "CRITICAL", expectedBehavior: portuguese ? "O acesso é negado sem expor dados sensíveis." : "Access is denied without exposing sensitive data.", automation: "AUTOMATION_HIGHLY_RECOMMENDED" },
        ...(mentionsIntegration ? [{ id: "SC-005", title: portuguese ? "Tratar falha da integração" : "Handle integration failure", category: "INTEGRATION" as const, description: portuguese ? "Simular timeout e erro do serviço dependente." : "Simulate a timeout and error from the dependent service.", priority: "HIGH" as const, expectedBehavior: portuguese ? "O estado permanece consistente e o usuário recebe uma orientação clara." : "State remains consistent and the user receives clear guidance.", automation: "AUTOMATION_RECOMMENDED" as const }] : []),
        { id: "SC-006", title: portuguese ? "Evitar regressão de dados existentes" : "Avoid regression on existing data", category: "REGRESSION", description: portuguese ? "Confirmar que fluxos relacionados continuam funcionando após a alteração." : "Confirm related flows continue working after the change.", priority: "MEDIUM", expectedBehavior: portuguese ? "Dados e fluxos previamente suportados permanecem íntegros." : "Previously supported data and flows remain intact.", automation: "AUTOMATION_RECOMMENDED" },
      ],
      edgeCases: [
        { value: "null", category: "INVALID_INPUT", reason: portuguese ? "Confirma o comportamento quando o campo obrigatório não é enviado." : "Confirms behavior when a required field is not sent." },
        { value: "empty string", category: "INVALID_INPUT", reason: portuguese ? "Diferencia valor vazio de ausência do campo." : "Distinguishes an empty value from a missing field." },
        { value: "maximum allowed value", category: "BOUNDARY", reason: portuguese ? "Valida a inclusão do limite superior." : "Validates inclusion of the upper limit." },
        { value: "maximum + 1", category: "BOUNDARY", reason: portuguese ? "Valida a rejeição imediatamente após o limite." : "Validates rejection immediately beyond the limit." },
        { value: "unexpected data type", category: "DATA_TYPE", reason: portuguese ? "Evita parsing inconsistente e falhas não tratadas." : "Prevents inconsistent parsing and unhandled failures." },
        ...(mentionsAuth ? [{ value: "expired or modified token", category: "SECURITY" as const, reason: portuguese ? "Garante que credenciais inválidas não autorizem a ação." : "Ensures invalid credentials cannot authorize the action." }] : []),
      ],
      gherkin: [
        { title: portuguese ? "Fluxo principal" : "Happy path", category: "HAPPY_PATH", content: portuguese ? "Funcionalidade: Executar a ação solicitada\n\nCenário: Concluir com dados válidos\n  Dado que o usuário possui permissão para executar a ação\n  Quando envia dados válidos\n  Então a alteração deve ser persistida\n  E uma confirmação deve ser apresentada" : "Feature: Complete requested action\n\nScenario: Complete with valid data\n  Given the user has permission to perform the action\n  When valid data is submitted\n  Then the change should be persisted\n  And a confirmation should be shown" },
        { title: portuguese ? "Validação de erro" : "Validation error", category: "NEGATIVE", content: portuguese ? "Cenário: Rejeitar dados inválidos\n  Dado que o usuário está no fluxo\n  Quando envia dados inválidos\n  Então a alteração não deve ser persistida\n  E uma mensagem de validação deve ser apresentada" : "Scenario: Reject invalid data\n  Given the user is in the flow\n  When invalid data is submitted\n  Then the change should not be persisted\n  And a validation message should be displayed" },
        { title: portuguese ? "Acesso não autorizado" : "Unauthorized access", category: "SECURITY", content: portuguese ? "Cenário: Bloquear usuário sem permissão\n  Dado que a sessão não é válida\n  Quando tenta executar a ação\n  Então o acesso deve ser negado\n  E nenhum dado sensível deve ser exposto" : "Scenario: Block an unauthorized user\n  Given the session is not valid\n  When the action is attempted\n  Then access should be denied\n  And no sensitive data should be exposed" },
      ],
      coverage: {
        functional: 85, negative: 75, boundary: 60, security: mentionsAuth ? 75 : 45, integration: mentionsIntegration ? 70 : 30, regression: 65,
        lowCoverageAreas: [portuguese ? "Limites e formatos de entrada" : "Input boundaries and formats", ...(mentionsIntegration ? [portuguese ? "Recuperação de falhas de integração" : "Integration-failure recovery"] : [])],
      },
    };
  }
}
