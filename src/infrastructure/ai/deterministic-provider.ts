import type { AIProvider } from "../../domain/ai/provider";
import type { RequirementAnalysis, RequirementInput } from "../../schemas/analysis";

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
    // Individual factor scores — total and level are computed by the Zod schema .transform()
    const impactScore = mentionsOrder || mentionsAuth ? 4 : 2;
    const probabilityScore = mentionsIntegration ? 3 : 2;
    const complexityScore = mentionsIntegration || mentionsOrder ? 3 : 2;
    const detectabilityScore = 3;
    const score = impactScore + probabilityScore + complexityScore + detectabilityScore;
    const level = score >= 16 ? "CRITICAL" as const : score >= 11 ? "HIGH" as const : score >= 6 ? "MEDIUM" as const : "LOW" as const;

    return {
      completeness: {
        status: "GOOD",
        score: 85,
        rationale: portuguese ? "Requisito mockado de forma determinista com nível de detalhamento suficiente." : "Requirement mocked deterministically with sufficient detail level.",
      },
      summary: portuguese ? `O requisito solicita que ${actor} ${input.requirement.replace(/\.$/, "").toLowerCase()}.` : `The requirement asks ${actor} to ${input.requirement.replace(/\.$/, "").toLowerCase()}.`,
      requirementFacts: input.acceptanceCriteria
        ? input.acceptanceCriteria.split(/\n|;/).map((item) => item.trim()).filter(Boolean)
        : [portuguese ? "Nenhum critério de aceite explícito foi fornecido." : "No explicit acceptance criteria were provided."],
      inferredRisks: [
        portuguese ? "Inferência QA: Requisições concorrentes podem gerar estados inconsistentes." : "QA Inference: Concurrent requests may generate inconsistent states.",
        ...(mentionsIntegration ? [portuguese ? "Inferência QA: Integração pode falhar silenciosamente sem contrato de erro." : "QA Inference: Integration may fail silently without an error contract."] : []),
      ],
      requirementGaps: [
        portuguese ? "Lacuna do requisito: Regras de validação e valores de limite não definidos." : "Requirement gap: Validation rules and boundary values not defined.",
        portuguese ? "Lacuna do requisito: Comportamento esperado para retry e requisições concorrentes não definido." : "Requirement gap: Expected behavior for retries and concurrent requests not defined.",
        ...(mentionsAuth ? [portuguese ? "Lacuna do requisito: Requisitos de autenticação, autorização e expiração de token não especificados." : "Requirement gap: Authentication, authorization, and token expiry requirements not specified."] : []),
      ],
      contradictions: [],
      qaImpact: {
        criticalAreas: [
          portuguese ? "Validação de entradas do usuário" : "User input validation",
          ...(mentionsAuth ? [portuguese ? "Controle de acesso e autorização" : "Access control and authorization"] : []),
          ...(mentionsIntegration ? [portuguese ? "Resiliência da integração externa" : "External integration resilience"] : []),
        ],
        recommendedTesting: [
          portuguese ? "Testes funcionais do fluxo principal" : "Functional tests for the happy path",
          portuguese ? "Testes de regressão para dados existentes" : "Regression tests for existing data",
          ...(mentionsIntegration ? [portuguese ? "Testes de contrato da integração" : "Integration contract tests"] : []),
        ],
        regressionAreas: [
          portuguese ? "Fluxos relacionados ao ator principal" : "Flows related to the main actor",
        ],
        blockers: [],
      },
      actors: [actor],
      businessRules: input.acceptanceCriteria
        ? input.acceptanceCriteria.split(/\n|;/).map((item) => item.trim()).filter(Boolean)
        : [portuguese ? "O resultado esperado e as regras de validação precisam ser definidos." : "The expected business outcome and validation rules must be defined."],
      dependencies: mentionsIntegration ? [portuguese ? "Uma integração está implícita e precisa de um contrato para falhas." : "An external or internal integration is implied and needs a failure contract."] : [],
      preconditions: [portuguese ? "O ator possui a permissão e o estado de conta necessários para iniciar a ação." : "The actor has the required account state and permission to initiate the action."],
      postconditions: [portuguese ? "A alteração solicitada é persistida e visível na jornada relevante." : "The requested change is persisted and visible in the relevant user journey."],
      ambiguities: [
        {
          term: portuguese ? "Retorno de sucesso/erro" : "Success/error feedback",
          problem: portuguese ? "Os retornos de sucesso e erro não foram definidos explicitamente." : "Success and error feedback are not explicitly defined.",
          requiredInformation: portuguese ? "Definir mensagens de sucesso e erro para cada cenário." : "Define success and error messages for each scenario.",
          questionForPo: portuguese ? "Quais mensagens o usuário deve ver em caso de sucesso ou falha?" : "What messages should the user see on success or failure?",
        },
      ],
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
        impact: {
          score: mentionsOrder || mentionsAuth ? 4 : 2,
          rationale: portuguese ? "Impacto baseado na relevância para o fluxo principal do usuário." : "Impact based on relevance to the main user flow.",
        },
        probability: {
          score: mentionsIntegration ? 3 : 2,
          rationale: portuguese ? "Probabilidade de falha considerando complexidade e dependências." : "Failure probability considering complexity and dependencies.",
        },
        complexity: {
          score: mentionsIntegration || mentionsOrder ? 3 : 2,
          rationale: portuguese ? "Complexidade baseada nas dependências e regras inferidas." : "Complexity based on dependencies and inferred rules.",
        },
        detectability: {
          score: 3,
          rationale: portuguese ? "Falhas podem não ser imediatamente visíveis sem monitoramento adequado." : "Failures may not be immediately visible without proper monitoring.",
        },
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
        {
          id: "TC-001",
          title: portuguese ? "Executar o fluxo com dados válidos" : "Complete the flow with valid data",
          type: "Functional",
          category: "POSITIVE",
          description: portuguese ? "Confirmar que o ator autorizado conclui a ação solicitada." : "Confirm that an authorized actor completes the requested action.",
          prerequisites: portuguese
            ? ["Usuário autenticado e com permissão", "Sistema online", "Dados de entrada válidos"]
            : ["Authenticated user with correct permission", "System online", "Valid input data"],
          testData: "N/A",
          steps: portuguese ? ["Acessar o sistema", "Preencher os dados", "Enviar formulário"] : ["Access system", "Fill data", "Submit form"],
          gherkin: portuguese
            ? "Cenário: Executar fluxo com dados válidos\n  Dado que o usuário está autenticado e tem permissão\n  Quando envia dados de entrada válidos\n  Então o fluxo deve ser executado com sucesso"
            : "Scenario: Execute flow with valid data\n  Given the user is authenticated and has permission\n  When valid input data is submitted\n  Then the flow should be executed successfully",
          priority: "HIGH",
          expectedBehavior: portuguese ? "A alteração é persistida e uma confirmação clara é apresentada." : "The change is persisted and a clear confirmation is shown.",
          automation: "AUTOMATION_HIGHLY_RECOMMENDED"
        },
        {
          id: "TC-002",
          title: portuguese ? "Rejeitar dados inválidos" : "Reject invalid input",
          type: "Functional",
          category: "NEGATIVE",
          description: portuguese ? "Enviar dados ausentes ou inválidos na requisição." : "Submit missing or invalid data in the request.",
          prerequisites: portuguese
            ? ["Usuário está na tela/fluxo", "Dados inválidos preparados"]
            : ["User is in the workflow", "Invalid input data prepared"],
          testData: "Invalid input values",
          steps: portuguese ? ["Acessar o formulário", "Preencher dados incorretos", "Tentar enviar"] : ["Access form", "Fill incorrect data", "Try to submit"],
          gherkin: portuguese
            ? "Cenário: Rejeitar dados inválidos\n  Dado que o usuário está no fluxo\n  Quando fornece dados inválidos\n  Então o sistema deve exibir uma mensagem de erro"
            : "Scenario: Reject invalid input\n  Given the user is in the workflow\n  When invalid data is submitted\n  Then the system should display an error message",
          priority: "HIGH",
          expectedBehavior: portuguese ? "A validação impede a alteração e apresenta mensagem acionável." : "Validation prevents the change and shows an actionable message.",
          automation: "AUTOMATION_HIGHLY_RECOMMENDED"
        },
        {
          id: "TC-003",
          title: portuguese ? "Validar valores de limite" : "Validate boundary values",
          type: "Functional",
          category: "BOUNDARY",
          description: portuguese ? "Testar os valores mínimo, máximo e imediatamente fora das regras." : "Test the minimum, maximum, and values immediately outside the rules.",
          prerequisites: portuguese
            ? ["Valores de limite identificados"]
            : ["Boundary values identified"],
          testData: "Boundary edge cases",
          steps: ["Input boundary values", "Submit request"],
          gherkin: portuguese
            ? "Cenário: Validar valores limite\n  Dado que os limites estão definidos\n  Quando os valores de limite são inseridos\n  Então o sistema deve processá-los corretamente"
            : "Scenario: Validate boundary values\n  Given boundary limits are defined\n  When boundary values are input\n  Then the system should process them correctly",
          priority: "MEDIUM",
          expectedBehavior: portuguese ? "Somente valores dentro do limite são aceitos." : "Only values within the boundary are accepted.",
          automation: "AUTOMATION_RECOMMENDED"
        },
        {
          id: "TC-004",
          title: portuguese ? "Bloquear acesso não autorizado" : "Block unauthorized access",
          type: "Security",
          category: "SECURITY",
          description: portuguese ? "Tentar a ação sem autenticação válida ou com usuário diferente." : "Attempt the action without valid authentication or as another user.",
          prerequisites: portuguese
            ? ["Sessão do usuário inválida ou expirada"]
            : ["Invalid or expired user session"],
          testData: "Expired token, missing token",
          steps: ["Attempt restricted action"],
          gherkin: portuguese
            ? "Cenário: Bloquear acesso não autorizado\n  Dado que o usuário não está autenticado\n  Quando tenta executar a ação\n  Então o acesso deve ser bloqueado"
            : "Scenario: Block unauthorized access\n  Given the user is not authenticated\n  When attempting to perform the action\n  Then access should be blocked",
          priority: "CRITICAL",
          expectedBehavior: portuguese ? "O acesso é negado sem expor dados sensíveis." : "Access is denied without exposing sensitive data.",
          automation: "AUTOMATION_HIGHLY_RECOMMENDED"
        },
        ...(mentionsIntegration ? [{
          id: "TC-005",
          title: portuguese ? "Tratar falha da integração" : "Handle integration failure",
          type: "Integration",
          category: "INTEGRATION" as const,
          description: portuguese ? "Simular timeout e erro do serviço dependente." : "Simulate a timeout and error from the dependent service.",
          prerequisites: portuguese
            ? ["Serviço externo/integração offline"]
            : ["External integration service is offline"],
          testData: "N/A",
          steps: ["Trigger integration action"],
          gherkin: portuguese
            ? "Cenário: Tratar falha da integração\n  Dado que o serviço de integração está offline\n  Quando a ação é solicitada\n  Então o sistema deve falhar graciosamente"
            : "Scenario: Handle integration failure\n  Given the integration service is offline\n  When the action is requested\n  Then the system should fail gracefully",
          priority: "HIGH" as const,
          expectedBehavior: portuguese ? "O estado permanece consistente e o usuário recebe uma orientação clara." : "State remains consistent and the user receives clear guidance.",
          automation: "AUTOMATION_RECOMMENDED" as const
        }] : []),
        {
          id: "TC-006",
          title: portuguese ? "Evitar regressão de dados existentes" : "Avoid regression on existing data",
          type: "Regression",
          category: "REGRESSION",
          description: portuguese ? "Confirmar que fluxos relacionados continuam funcionando após a alteração." : "Confirm related flows continue working after the change.",
          prerequisites: portuguese
            ? ["Alterações recentes implantadas"]
            : ["Recent changes deployed"],
          testData: "N/A",
          steps: ["Run regression suite on related flows"],
          gherkin: portuguese
            ? "Cenário: Evitar regressão de dados existentes\n  Dado que a funcionalidade principal está ativa\n  Quando novos dados são processados\n  Então os dados existentes permanecem inalterados"
            : "Scenario: Avoid regression on existing data\n  Given primary functionality is active\n  When new data is processed\n  Then existing data remains unchanged",
          priority: "MEDIUM",
          expectedBehavior: portuguese ? "Dados e fluxos previamente suportados permanecem íntegros." : "Previously supported data and flows remain intact.",
          automation: "AUTOMATION_RECOMMENDED"
        },
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
      coverageSummary: {
        totalTestCases: 5,
        happyPathCases: 1,
        negativeCases: 2,
        edgeCases: 1,
        validationCases: 2,
        integrationCases: mentionsIntegration ? 1 : 0,
        authorizationCases: mentionsAuth ? 1 : 0,
        uncoveredAreas: [
          portuguese ? "Lacuna do requisito: limites e formatos de entrada não foram definidos." : "Requirement gap: input limits and formats are not defined.",
          ...(mentionsIntegration ? [portuguese ? "Lacuna do requisito: comportamento de recuperação para indisponibilidade da integração não foi definido." : "Requirement gap: recovery behavior for integration unavailability is not defined."] : []),
        ],
      },
      regressionImpact: input.projectContext?.regressionImpact ?? {
        impactedModules: [], relatedRules: [], relatedFeatures: [], recommendedRegressionScenarios: [], potentialRequirementConflicts: [],
      },
      contextSourcesUsed: input.projectContext?.entries.map(({ type, title, source }) => ({ type, title, source })) ?? [],
    };
  }
}
