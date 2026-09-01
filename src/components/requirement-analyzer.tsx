"use client";

import { useEffect, useState } from "react";
import type { AnalysisResponse } from "../schemas/analysis";
import type { QAIssue } from "../schemas/review";
import { buildTraceabilityMatrix } from "../application/traceability-matrix";

type Locale = "pt" | "en";
type HistoryItem = { id: string; requirement: string; riskScore: number; riskLevel: string; summary: string; createdAt: string };
type Project = { id: string; name: string; description?: string | null };
type ContextEntry = { id: string; type: string; title: string; content: string; source: string };

const copy = {
  pt: {
    title: "Revele o que seu requisito nao conta.",
    subtitle: "Transforme requisitos em riscos, perguntas e casos de teste antes que virem defeitos.",
    requirement: "Requisito",
    context: "Contexto adicional",
    analyze: "Analisar requisito",
    analyzing: "Analisando...",
    rules: "Regras de negocio",
    ambiguities: "Ambiguidades",
    missing: "Informacoes ausentes",
    questions: "Perguntas para o Product Owner",
    placeholder: "Como cliente, quero alterar meu endereco de entrega antes que o pedido seja despachado.",
    facts: "Fatos do requisito",
    gaps: "Lacunas",
    inferredRisks: "Riscos inferidos",
    contradictions: "Contradicoes",
    actors: "Atores",
    preconditions: "Precondições",
    postconditions: "Poscondições",
    dependencies: "Dependências",
    qaImpact: "Impacto no QA",
    criticalAreas: "Áreas críticas",
    recommendedTesting: "Testes recomendados",
    regressionAreas: "Áreas de regressão",
    blockers: "Bloqueadores",
    riskBreakdown: "Detalhamento do Risco",
    impact: "Impacto",
    probability: "Probabilidade",
    complexity: "Complexidade",
    detectability: "Detectabilidade",
    riskFactors: "Fatores de risco",
    completeness: "Completude",
    qaReview: "QA Review",
    initialScore: "Score inicial",
    finalScore: "Score final",
    issuesFound: "Problemas encontrados",
    correctionsMade: "Correcoes realizadas",
    remainingIssues: "Problemas restantes",
    autoCorrect: "Corrigir automaticamente",
    autoCorrecting: "Corrigindo com IA...",
    autoCorrectHint: "A correcao sera feita pela IA. A analise original sera preservada e nao substituida em silencio.",
    originalAnalysis: "Analise original",
    correctedAnalysis: "Analise corrigida",
    skippedCorrection: "Correcao automatica nao executada: a analise ja atende o criterio de qualidade.",
    corrected: "Corrigido",
    retained: "Mantido",
    skipped: "Ignorado neste ciclo",
    playwrightAutomation: "Automação Playwright",
    generatePlaywright: "Gerar código",
    generatingPlaywright: "Gerando código...",
    copyCode: "Copiar código",
    copied: "Copiado",
    downloadSpec: "Baixar .spec.ts (em breve)",
    coverageSummary: "Resumo de cobertura",
    uncoveredAreas: "Áreas não cobertas por falta de informação",
  },
  en: {
    title: "Reveal what your requirements don't tell you.",
    subtitle: "Turn requirements into risks, questions, and test cases before they become defects.",
    requirement: "Requirement",
    context: "Additional context",
    analyze: "Analyze requirement",
    analyzing: "Analyzing...",
    rules: "Business rules",
    ambiguities: "Ambiguities",
    missing: "Missing information",
    questions: "Questions for the Product Owner",
    placeholder: "As a customer, I want to change my shipping address before my order is dispatched.",
    facts: "Requirement facts",
    gaps: "Gaps",
    inferredRisks: "Inferred risks",
    contradictions: "Contradictions",
    actors: "Actors",
    preconditions: "Preconditions",
    postconditions: "Postconditions",
    dependencies: "Dependencies",
    qaImpact: "QA Impact",
    criticalAreas: "Critical areas",
    recommendedTesting: "Recommended testing",
    regressionAreas: "Regression areas",
    blockers: "Blockers",
    riskBreakdown: "Risk Breakdown",
    impact: "Impact",
    probability: "Probability",
    complexity: "Complexity",
    detectability: "Detectability",
    riskFactors: "Risk factors",
    completeness: "Completeness",
    qaReview: "QA Review",
    initialScore: "Initial score",
    finalScore: "Final score",
    issuesFound: "Issues found",
    correctionsMade: "Corrections applied",
    remainingIssues: "Remaining issues",
    autoCorrect: "Correct automatically",
    autoCorrecting: "Correcting with AI...",
    autoCorrectHint: "Correction is performed by AI. The original analysis is preserved and never replaced silently.",
    originalAnalysis: "Original analysis",
    correctedAnalysis: "Corrected analysis",
    skippedCorrection: "Automatic correction skipped: the analysis already meets the quality threshold.",
    corrected: "Corrected",
    retained: "Retained",
    skipped: "Skipped this cycle",
    playwrightAutomation: "Playwright Automation",
    generatePlaywright: "Generate code",
    generatingPlaywright: "Generating code...",
    copyCode: "Copy code",
    copied: "Copied",
    downloadSpec: "Download .spec.ts (coming soon)",
    coverageSummary: "Coverage summary",
    uncoveredAreas: "Areas not covered due to missing information",
  },
} as const;

export function RequirementAnalyzer() {
  const [locale, setLocale] = useState<Locale>("pt");
  const [requirement, setRequirement] = useState<string>(copy.pt.placeholder);
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [analysisView, setAnalysisView] = useState<"original" | "corrected">("corrected");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [playwrightCode, setPlaywrightCode] = useState<{ testCaseId: string; code: string } | null>(null);
  const [generatingTestCaseId, setGeneratingTestCaseId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [screen, setScreen] = useState<"analysis" | "history" | "projects">("analysis");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const t = copy[locale];

  const chooseLocale = (next: Locale) => {
    setLocale(next);
    setRequirement(copy[next].placeholder);
    setResult(null);
    setFile(null);
  };

  const upload = async (selected: File) => {
    const extension = selected.name.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "docx", "txt", "md"].includes(extension))
      return setError("Formato nao suportado. Envie PDF, DOCX, TXT ou MD.");
    if (!selected.size) return setError("O arquivo esta vazio.");
    if (selected.size > 5 * 1024 * 1024) return setError("O arquivo excede o limite de 5 MB.");
    setError(null);
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", selected);
      const response = await fetch("/api/extract", { method: "POST", body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Falha ao extrair o documento.");
      setRequirement(body.text);
      setFile(selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const loadHistory = async () => {
    setScreen("history");
    setError(null);
    try {
      const response = await fetch(`/api/analyses${projectId ? `?projectId=${projectId}` : ""}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Falha ao carregar historico.");
      setHistory(body.analyses);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar historico.");
    }
  };

  const deleteHistoryItem = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta analise?")) return;
    try {
      const response = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Falha ao excluir.");
      setHistory((prev) => prev ? prev.filter((item) => item.id !== id) : null);
    } catch (cause) {
      alert("Erro ao excluir analise.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement, additionalContext, locale, ...(projectId ? { projectId } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Analysis failed.");
      setResult(body);
      setAnalysisView("corrected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const submitCorrect = async () => {
    if (!result?.analysis || !result.review) return;
    setCorrecting(true);
    setError(null);
    try {
      const response = await fetch("/api/analyses/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement,
          additionalContext,
          locale,
          ...(projectId ? { projectId } : {}),
          analysis: result.originalAnalysis ?? result.analysis,
          review: result.initialReview ?? result.review,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Auto-correction failed.");
      setResult(body);
      setAnalysisView("corrected");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Auto-correction failed.");
    } finally {
      setCorrecting(false);
    }
  };

  const refreshProjects = async () => {
    try { const response = await fetch("/api/projects"); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Falha ao carregar projetos."); setProjects(body.projects); return body.projects as Project[]; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar projetos."); return null; }
  };
  const loadProjects = async () => { setScreen("projects"); setError(null); await refreshProjects(); };
  useEffect(() => { void refreshProjects(); }, []);

  const generatePlaywright = async (testCase: AnalysisResponse["analysis"]["scenarios"][number]) => {
    setGeneratingTestCaseId(testCase.id);
    setError(null);
    try {
      const response = await fetch("/api/playwright", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCase, requirement, additionalContext, locale }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Falha ao gerar código Playwright.");
      setPlaywrightCode({ testCaseId: testCase.id, code: body.code });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao gerar código Playwright.");
    } finally {
      setGeneratingTestCaseId(null);
    }
  };

  const displayedAnalysis = result
    ? analysisView === "original" && result.originalAnalysis
      ? result.originalAnalysis
      : result.analysis
    : null;

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand">QA<span>Veil</span> <small>AI</small></div>
        <p>WORKSPACE</p>
        <button className={screen === "analysis" ? "active" : ""} onClick={() => setScreen("analysis")}>Nova analise</button>
        <button className={screen === "history" ? "active" : ""} onClick={loadHistory}>Historico</button>
        <button className={screen === "projects" ? "active" : ""} onClick={loadProjects}>Projetos</button>
        <small className="provider-status">Provider configurado no servidor</small>
      </aside>
      <section className="surface">
        <header>
          <p>QUALITY ENGINEERING INTELLIGENCE</p>
          <div className="language">
            <button className={locale === "pt" ? "selected" : ""} onClick={() => chooseLocale("pt")}>PT</button>
            <button className={locale === "en" ? "selected" : ""} onClick={() => chooseLocale("en")}>EN</button>
          </div>
        </header>
        <div className="content">
          {screen === "history" ? (
            <History items={history} onBack={() => setScreen("analysis")} onDelete={deleteHistoryItem} />
          ) : screen === "projects" ? (
            <Projects projects={projects} selectedId={projectId} onProjectsChange={setProjects} onSelect={setProjectId} onAnalyze={() => setScreen("analysis")} onError={setError} />
          ) : (
            <>
              <h1>{t.title}</h1>
              <p className="lead">{t.subtitle}</p>
              <div className="analysis-layout">
                <form className="input-card" onSubmit={submit}>
                  <div
                    className={`upload-zone ${dragging ? "drag-active" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const selected = e.dataTransfer.files[0];
                      if (selected) void upload(selected);
                    }}
                  >
                    {uploading ? (
                      <p>Extraindo texto do documento...</p>
                    ) : file ? (
                      <div className="file-loaded">
                        <span>{file.name} <small>({Math.ceil(file.size / 1024)} KB)</small></span>
                        <button type="button" onClick={() => { setFile(null); setRequirement(""); }}>Remover</button>
                      </div>
                    ) : (
                      <label className="upload-label">
                        <input type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => {
                          const selected = e.target.files?.[0];
                          if (selected) void upload(selected);
                        }} />
                        <b>Arraste um documento</b> ou clique para selecionar<br />
                        <small>PDF, DOCX, TXT ou MD · max. 5 MB</small>
                      </label>
                    )}
                  </div>
                  <label htmlFor="requirement">{t.requirement} {file && <small>· texto extraido de {file.name}</small>}</label>
                  <textarea id="requirement" value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={8} />
                  <label htmlFor="context">{t.context} <small>(opcional)</small></label>
                  <input id="context" value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} />
                  <label htmlFor="project">Projeto <small>(opcional; análise rápida sem projeto)</small></label>
                  <select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Análise rápida</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
                  <button className="primary" disabled={loading || uploading}>{loading ? t.analyzing : t.analyze}</button>
                </form>
                <Risk result={result} t={t} />
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              {result && displayedAnalysis ? (
                <div className="results-container">
                  {(result.review || result.initialReview) && (
                    <QAReviewCard result={result} t={t} correcting={correcting} onAutoCorrect={() => void submitCorrect()} />
                  )}
                  {result.originalAnalysis && result.correction && !result.correction.skipped && (
                    <div className="analysis-view-toggle">
                      <button type="button" className={analysisView === "original" ? "selected" : ""} onClick={() => setAnalysisView("original")}>{t.originalAnalysis}</button>
                      <button type="button" className={analysisView === "corrected" ? "selected" : ""} onClick={() => setAnalysisView("corrected")}>{t.correctedAnalysis}</button>
                    </div>
                  )}
                  <AnalysisResult
                    result={{ ...result, analysis: displayedAnalysis }}
                    finalAnalysis={result.analysis}
                    canGeneratePlaywright={analysisView === "corrected"}
                    generatedCode={playwrightCode}
                    generatingTestCaseId={generatingTestCaseId}
                    onGeneratePlaywright={generatePlaywright}
                    analysisId={result.analysisId}
                    t={t}
                  />
                </div>
              ) : (
                <div className="empty">
                  <b>Analise pronta para comecar</b>
                  <p>Riscos, ambiguidades e casos de teste aparecerao aqui.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function RiskBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? "var(--risk-critical)" : pct >= 60 ? "var(--risk-high)" : pct >= 40 ? "var(--risk-medium)" : "var(--risk-low)";
  return (
    <div className="risk-bar-track">
      <div className="risk-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Risk({ result, t }: { result: AnalysisResponse | null; t: typeof copy.pt | typeof copy.en }) {
  const risk = result?.analysis.risk;
  return (
    <section className="risk-card">
      <span>RISK SCORE</span>
      <div className="risk-score-value">
        <strong>{risk?.score ?? "—"}</strong>
        <b>{risk?.level ?? "PENDING"}</b>
      </div>
      <p>{risk?.rationale ?? "A analise de risco aparece apos avaliar o requisito."}</p>
      <i style={{ width: `${(risk?.score ?? 0) * 5}%` }} />
      {risk && (
        <div className="risk-factors-breakdown">
          <p className="risk-breakdown-title">{t.riskBreakdown}</p>
          {(["impact", "probability", "complexity", "detectability"] as const).map((factor) => (
            <div key={factor} className="risk-factor-row">
              <div className="risk-factor-label">
                <span>{t[factor]}</span>
                <b>{risk[factor].score}/5</b>
              </div>
              <RiskBar score={risk[factor].score} />
              <small>{risk[factor].rationale}</small>
            </div>
          ))}
          {risk.factors.length > 0 && (
            <div className="risk-factor-tags">
              {risk.factors.map((f, i) => <span key={i} className="tag">{f}</span>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function Gherkin({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section className="gherkin-wrapper">
      <div className="gherkin-header">
        <h4>GHERKIN</h4>
        <button type="button" className="copy-btn" onClick={() => void onCopy()}>{copied ? "Copiado" : "Copiar Gherkin"}</button>
      </div>
      <pre className="gherkin-block">
        {content.split("\n").map((line, index) => {
          const keyword = line.match(/^(Feature|Scenario|Given|When|Then|And|Funcionalidade|Cenário|Dado|Quando|Então|E)(:)?/)?.[0];
          return (
            <code className="gh-line" key={index}>
              {keyword && <span className="gh-keyword">{keyword}</span>}
              {line.slice(keyword?.length ?? 0)}
            </code>
          );
        })}
      </pre>
    </section>
  );
}

function PlaywrightAutomation({
  scenario,
  code,
  generating,
  onGenerate,
  t,
}: {
  scenario: AnalysisResponse["analysis"]["scenarios"][number];
  code?: string;
  generating: boolean;
  onGenerate: () => void;
  t: typeof copy.pt | typeof copy.en;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="playwright-automation">
      <div className="playwright-header">
        <h4>{t.playwrightAutomation}</h4>
        <button type="button" className="copy-btn" disabled={generating} onClick={onGenerate}>
          {generating ? t.generatingPlaywright : t.generatePlaywright}
        </button>
      </div>
      {code ? (
        <>
          <pre className="playwright-code"><code>{code}</code></pre>
          <div className="playwright-actions">
            <button type="button" className="copy-btn" onClick={() => void onCopy()}>{copied ? t.copied : t.copyCode}</button>
            <button type="button" className="copy-btn" disabled={generating} onClick={onGenerate}>{t.generatePlaywright}</button>
            <button type="button" className="copy-btn" disabled data-download-filename={`${scenario.id}.spec.ts`}>{t.downloadSpec}</button>
          </div>
        </>
      ) : (
        <p>Gere um esqueleto TypeScript válido a partir deste Test Case final aprovado.</p>
      )}
    </section>
  );
}
function ScenarioCard({
  scenario,
  canGeneratePlaywright,
  code,
  generating,
  onGeneratePlaywright,
  t,
}: {
  scenario: AnalysisResponse["analysis"]["scenarios"][number];
  canGeneratePlaywright: boolean;
  code?: string;
  generating: boolean;
  onGeneratePlaywright: (scenario: AnalysisResponse["analysis"]["scenarios"][number]) => void;
  t: typeof copy.pt | typeof copy.en;
}) {
  return (
    <article className="scenario-card">
      <div className="scenario-topline">
        <span>{scenario.id}</span>
        <div>
          <i className="badge badge-type">{scenario.type}</i>
          <i className={`badge badge-${scenario.priority.toLowerCase()}`}>{scenario.priority}</i>
          <i className="badge badge-automation">{scenario.automation.replaceAll("_", " ")}</i>
        </div>
      </div>
      <h3>{scenario.title}</h3>
      <section className="scenario-description">
        <h4>Descricao</h4>
        <p>{scenario.description}</p>
      </section>
      <div className="scenario-grid">
        <section>
          <h4>Pre-requisitos</h4>
          <ul>{scenario.prerequisites.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </section>
        <section>
          <h4>Dados de teste</h4>
          <pre className="test-data-block">{scenario.testData || "N/A"}</pre>
        </section>
        {scenario.steps && scenario.steps.length > 0 && (
          <section className="scenario-steps">
            <h4>Passos</h4>
            <ol>{scenario.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
          </section>
        )}
      </div>
      <Gherkin content={scenario.gherkin} />
      {canGeneratePlaywright && (
        <PlaywrightAutomation
          scenario={scenario}
          code={code}
          generating={generating}
          onGenerate={() => onGeneratePlaywright(scenario)}
          t={t}
        />
      )}
    </article>
  );
}

function StringList({ title, items }: { title: string; items: readonly string[] }) {
  if (!items.length) return null;
  return (
    <article>
      <h3>{title}</h3>
      <ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </article>
  );
}

function AnalysisResult({
  result,
  finalAnalysis,
  canGeneratePlaywright,
  generatedCode,
  generatingTestCaseId,
  onGeneratePlaywright,
  t,
  analysisId,
}: {
  result: AnalysisResponse;
  finalAnalysis: AnalysisResponse["analysis"];
  canGeneratePlaywright: boolean;
  generatedCode: { testCaseId: string; code: string } | null;
  generatingTestCaseId: string | null;
  onGeneratePlaywright: (scenario: AnalysisResponse["analysis"]["scenarios"][number]) => void;
  t: typeof copy.pt | typeof copy.en;
  analysisId?: string;
}) {
  const a = result.analysis;
  const completenessLabel = a.completeness.status + " (" + a.completeness.score + "/100)";

  return (
    <section className="results">
      <p className="result-provider">MODO: {result.provider}</p>
      <h2>Analise do requisito</h2>
      <p className="summary">{a.summary}</p>
      {analysisId && <div className="export-actions"><a className="copy-btn" href={`/api/analyses/${analysisId}/export?format=markdown`}>Exportar Markdown</a><a className="copy-btn" href={`/api/analyses/${analysisId}/export?format=pdf`}>Exportar PDF</a></div>}

      {/* Completeness */}
      <article>
        <h3>{t.completeness}</h3>
        <p><strong>{completenessLabel}</strong> — {a.completeness.rationale}</p>
      </article>

      <article className="coverage-summary-card">
        <h3>{t.coverageSummary}</h3>
        <div className="coverage-summary-grid">
          <span><b>{a.coverageSummary.totalTestCases}</b> Test Cases</span>
          <span><b>{a.coverageSummary.happyPathCases}</b> Happy Path</span>
          <span><b>{a.coverageSummary.negativeCases}</b> Negative</span>
          <span><b>{a.coverageSummary.edgeCases}</b> Edge</span>
          <span><b>{a.coverageSummary.validationCases}</b> Validation</span>
          <span><b>{a.coverageSummary.integrationCases}</b> Integration</span>
          <span><b>{a.coverageSummary.authorizationCases}</b> Authorization</span>
        </div>
        {a.coverageSummary.uncoveredAreas.length > 0 && (
          <div className="uncovered-areas">
            <h4>{t.uncoveredAreas}</h4>
            <ul>{a.coverageSummary.uncoveredAreas.map((area, index) => <li key={index}>{area}</li>)}</ul>
          </div>
        )}
      </article>
      <TraceabilityMatrix analysis={a} generatedTestCaseIds={generatedCode ? [generatedCode.testCaseId] : []} />

      {/* Facts / Gaps / Inferences / Contradictions */}
      <StringList title={t.facts} items={a.requirementFacts} />
      <StringList title={t.gaps} items={a.requirementGaps} />
      <StringList title={t.inferredRisks} items={a.inferredRisks} />
      <StringList title={t.contradictions} items={a.contradictions} />

      {/* QA Impact */}
      {(a.qaImpact.criticalAreas.length > 0 || a.qaImpact.recommendedTesting.length > 0 || a.qaImpact.regressionAreas.length > 0 || a.qaImpact.blockers.length > 0) && (
        <article className="qa-impact-card">
          <h3>{t.qaImpact}</h3>
          <div className="qa-impact-grid">
            {a.qaImpact.criticalAreas.length > 0 && (
              <div>
                <h4>{t.criticalAreas}</h4>
                <ul>{a.qaImpact.criticalAreas.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            )}
            {a.qaImpact.recommendedTesting.length > 0 && (
              <div>
                <h4>{t.recommendedTesting}</h4>
                <ul>{a.qaImpact.recommendedTesting.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            )}
            {a.qaImpact.regressionAreas.length > 0 && (
              <div>
                <h4>{t.regressionAreas}</h4>
                <ul>{a.qaImpact.regressionAreas.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            )}
            {a.qaImpact.blockers.length > 0 && (
              <div>
                <h4>{t.blockers}</h4>
                <ul>{a.qaImpact.blockers.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            )}
          </div>
        </article>
      )}

      {/* Detail grid */}
      <div className="result-grid">
        <StringList title={t.actors} items={a.actors} />
        <StringList title={t.preconditions} items={a.preconditions} />
        <StringList title={t.postconditions} items={a.postconditions} />
        <StringList title={t.dependencies} items={a.dependencies} />
        <StringList title={t.rules} items={a.businessRules} />
        <StringList title={t.missing} items={a.missingInformation} />
        <StringList title={t.questions} items={a.questionsForPo} />
        {a.ambiguities.length > 0 && (
          <article>
            <h3>{t.ambiguities}</h3>
            <ul>
              {a.ambiguities.map((amb, i) => (
                <li key={i}>
                  <strong>{amb.term}</strong>: {amb.problem}
                  {amb.questionForPo && <em> → {amb.questionForPo}</em>}
                </li>
              ))}
            </ul>
          </article>
        )}
      </div>

      {/* Test Scenarios */}
      <section className="scenario-list">
        <h2>Test Cases</h2>
        {a.scenarios.map((scenario) => {
          const finalScenario = finalAnalysis.scenarios.find((item) => item.id === scenario.id);
          return <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            canGeneratePlaywright={canGeneratePlaywright && Boolean(finalScenario)}
            code={generatedCode?.testCaseId === scenario.id ? generatedCode.code : undefined}
            generating={generatingTestCaseId === scenario.id}
            onGeneratePlaywright={() => finalScenario && onGeneratePlaywright(finalScenario)}
            t={t}
          />;
        })}
      </section>
    </section>
  );
}

function Projects({ projects, selectedId, onProjectsChange, onSelect, onAnalyze, onError }: { projects: Project[]; selectedId: string; onProjectsChange: (projects: Project[]) => void; onSelect: (id: string) => void; onAnalyze: () => void; onError: (error: string | null) => void }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [editName, setEditName] = useState(""); const [editDescription, setEditDescription] = useState(""); const [entries, setEntries] = useState<ContextEntry[]>([]); const [entryTitle, setEntryTitle] = useState(""); const [entryContent, setEntryContent] = useState(""); const [entryType, setEntryType] = useState("BUSINESS_RULE"); const [feedback, setFeedback] = useState(""); const selected = projects.find((project) => project.id === selectedId);
  const create = async (event: React.FormEvent) => { event.preventDefault(); setFeedback(""); onError(null); try { const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Falha ao criar projeto."); onProjectsChange([body.project, ...projects]); setName(""); setDescription(""); onSelect(body.project.id); setEntries([]); setFeedback("Projeto salvo com sucesso."); } catch (cause) { onError(cause instanceof Error ? cause.message : "Falha ao criar projeto."); } };
  const loadContext = async (id: string) => { const response = await fetch(`/api/projects/${id}/context`); const body = await response.json(); if (response.ok) setEntries(body.entries); };
  const addContext = async (event: React.FormEvent) => { event.preventDefault(); if (!selected) return; const response = await fetch(`/api/projects/${selected.id}/context`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: entryType, title: entryTitle, content: entryContent, source: "MANUAL" }) }); const body = await response.json(); if (response.ok) { setEntries([body.entry, ...entries]); setEntryTitle(""); setEntryContent(""); } };
  const saveProject = async (event: React.FormEvent) => { event.preventDefault(); if (!selected) return; const response = await fetch(`/api/projects/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, description: editDescription }) }); const body = await response.json(); if (response.ok) onProjectsChange(projects.map((project) => project.id === selected.id ? body.project : project)); };
  const upload = async (file: File) => { if (!selected) return; const data = new FormData(); data.append("file", file); const response = await fetch(`/api/projects/${selected.id}/documents`, { method: "POST", body: data }); const body = await response.json(); if (response.ok) setEntries([body.entry, ...entries]); };
  return <section className="projects"><h1>Projetos</h1><p className="lead">Contexto persistente confirmado pelo usuário. Análises rápidas permanecem independentes.</p>{feedback && <p className="project-feedback">{feedback}</p>}
    <form className="project-form" onSubmit={create}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do projeto" required /><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" /><button className="primary">Criar projeto</button></form>
    <div className="project-grid"><section><h2>Seus projetos</h2>{projects.map((project) => <button key={project.id} className={selectedId === project.id ? "project-item selected" : "project-item"} onClick={() => { onSelect(project.id); setEditName(project.name); setEditDescription(project.description ?? ""); void loadContext(project.id); }}><b>{project.name}</b><small>{project.description}</small></button>)}</section>
    {selected && <section className="project-context"><h2>{selected.name}</h2><p>{selected.description}</p><button className="copy-btn" onClick={onAnalyze}>Nova análise neste projeto</button><form onSubmit={saveProject}><h3>Editar projeto</h3><input value={editName} onChange={(e) => setEditName(e.target.value)} required /><input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descrição" /><button className="copy-btn">Salvar projeto</button></form><form onSubmit={addContext}><h3>Contexto / regra confirmada</h3><select value={entryType} onChange={(e) => setEntryType(e.target.value)}>{["BUSINESS_RULE", "PRODUCT_INFORMATION", "ACTOR", "INTEGRATION", "GLOSSARY", "TECHNICAL_CONSTRAINT", "OTHER"].map((type) => <option key={type}>{type}</option>)}</select><input value={entryTitle} onChange={(e) => setEntryTitle(e.target.value)} placeholder="Título, por exemplo BR-001" required /><textarea value={entryContent} onChange={(e) => setEntryContent(e.target.value)} placeholder="Conteúdo confirmado pelo usuário" required /><button className="primary">Adicionar contexto</button></form><label className="project-upload">Documento do projeto (PDF, DOCX, TXT ou MD)<input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} /></label><div className="context-list">{entries.map((entry) => <article key={entry.id}><b>{entry.type} · {entry.title}</b><p>{entry.content}</p><small>{entry.source}</small></article>)}</div></section>}</div></section>;
}
function TraceabilityMatrix({ analysis, generatedTestCaseIds }: { analysis: AnalysisResponse["analysis"]; generatedTestCaseIds: string[] }) {
  const [filter, setFilter] = useState<"ALL" | "COVERED" | "PARTIALLY_COVERED" | "NOT_COVERED">("ALL");
  const matrix = buildTraceabilityMatrix(analysis, generatedTestCaseIds); const items = filter === "ALL" ? matrix.items : matrix.items.filter((item) => item.status === filter);
  return <section className="traceability"><h2>Traceability Matrix</h2><div className="traceability-metrics"><span>Total {matrix.metrics.total}</span><span>Covered {matrix.metrics.covered}</span><span>Partial {matrix.metrics.partial}</span><span>Not Covered {matrix.metrics.notCovered}</span><b>{matrix.metrics.percentage}%</b></div><div className="traceability-filters">{(["ALL","COVERED","PARTIALLY_COVERED","NOT_COVERED"] as const).map((value) => <button key={value} className={filter===value?"selected":""} onClick={() => setFilter(value)}>{value.replaceAll("_"," ")}</button>)}</div><div className="traceability-scroll"><table><thead><tr><th>Item</th><th>Type</th><th>Status</th><th>Covered by</th><th>Playwright</th><th>Source</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><b>{item.id}</b><br/>{item.text}</td><td>{item.type}</td><td>{item.status}</td><td>{item.coveredBy.join(", ") || "-"}</td><td>{item.playwrightStatus}</td><td>{item.sourceTitle || "Current Requirement"}</td></tr>)}</tbody></table></div>{matrix.uncoveredItems.length > 0 && <article className="uncovered-items"><h3>Uncovered Items</h3><ul>{matrix.uncoveredItems.map((item)=><li key={item.id}><b>{item.id}</b> — {item.text} ({item.type})</li>)}</ul></article>}</section>;
}

function History({ items, onBack, onDelete }: { items: HistoryItem[] | null; onBack: () => void; onDelete: (id: string) => void }) {
  return (
    <section className="history">
      <button className="back" onClick={onBack}>← Voltar para analise</button>
      <h1>Historico de analises</h1>
      <p className="lead">As ultimas 50 analises salvas no banco de dados.</p>
      {items === null ? (
        <div className="empty">Carregando historico...</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <b>Nenhuma analise salva ainda.</b>
          <p>Configure DATABASE_URL e execute uma analise para criar o historico.</p>
        </div>
      ) : (
        <div className="history-list">
          {items.map((item) => (
            <article key={item.id} className="history-item">
              <div className="history-item-header">
                <span>{new Date(item.createdAt).toLocaleString()}</span>
                <button className="delete-btn" onClick={() => onDelete(item.id)}>Excluir</button>
              </div>
              <b>{item.riskScore} · {item.riskLevel}</b>
              <h3>{item.requirement}</h3>
              <p>{item.summary}</p>
              <div className="export-actions"><a className="copy-btn" href={`/api/analyses/${item.id}/export?format=markdown`}>Markdown</a><a className="copy-btn" href={`/api/analyses/${item.id}/export?format=pdf`}>PDF</a></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function IssueList({ issues }: { issues: QAIssue[] }) {
  if (!issues || issues.length === 0) return null;
  return (
    <ul className="issue-list">
      {issues.map((issue) => (
        <li key={issue.id} className="issue-item">
          <span className={`badge badge-${issue.severity.toLowerCase()}`}>{issue.severity}</span>
          <strong>{issue.type}</strong>
          <p>{issue.description}</p>
          {issue.affectedTestCase && <small>{issue.affectedTestCase}</small>}
          <em>{issue.recommendedAction}</em>
        </li>
      ))}
    </ul>
  );
}

function QAReviewCard({
  result,
  t,
  correcting,
  onAutoCorrect,
}: {
  result: AnalysisResponse;
  t: typeof copy.pt | typeof copy.en;
  correcting: boolean;
  onAutoCorrect: () => void;
}) {
  const initial = result.initialReview ?? result.review;
  const final = result.finalReview;
  const current = result.review ?? initial;
  if (!initial || !current) return null;
  const correction = result.correction;
  const alreadyCorrected = Boolean(correction && !correction.skipped);
  const skipped = Boolean(correction?.skipped);

  return (
    <section className="qa-review-section">
      <div className="qa-review-header">
        <h2>{t.qaReview}</h2>
        <div className="score-flow">
          <div className="score-badge">
            <span>{t.initialScore}</span>
            <strong className={initial.score >= 80 ? "good" : initial.score >= 50 ? "warning" : "critical"}>{initial.score}/100</strong>
          </div>
          {final && alreadyCorrected && (
            <>
              <span className="score-arrow">↓</span>
              <div className="score-badge">
                <span>{t.finalScore}</span>
                <strong className={final.score >= 80 ? "good" : final.score >= 50 ? "warning" : "critical"}>{final.score}/100</strong>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="summary">{current.overallAssessment}</p>

      <article>
        <h3>{t.issuesFound} ({initial.issues.length})</h3>
        <IssueList issues={initial.issues} />
      </article>

      {correction && alreadyCorrected && (
        <article className="corrections-made">
          <h3>{t.correctionsMade}</h3>
          <ul className="trace-list">
            {correction.trace.map((item) => (
              <li key={item.issueId}>
                {item.status === "CORRECTED" ? "✓" : "⚠"} {item.status === "CORRECTED" ? t.corrected : t.retained} — {item.type}
                {item.summary ? <small> · {item.summary}</small> : null}
              </li>
            ))}
          </ul>
        </article>
      )}

      {final && alreadyCorrected && (
        <article>
          <h3>{t.remainingIssues} ({final.issues.length})</h3>
          <IssueList issues={final.issues} />
        </article>
      )}

      <div className="review-grid">
        {current.strengths.length > 0 && (
          <article className="strengths">
            <h3>Pontos positivos</h3>
            <ul>{current.strengths.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </article>
        )}
        {current.potentiallyInventedRules.length > 0 && (
          <article className="invented-rules warning-card">
            <h3>Regras inventadas / alucinacoes</h3>
            <ul>{current.potentiallyInventedRules.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </article>
        )}
        {current.missingScenarios.length > 0 && (
          <article className="missing-scenarios">
            <h3>Cenarios faltantes</h3>
            <ul>{current.missingScenarios.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </article>
        )}
      </div>

      {current.recommendations.length > 0 && (
        <article className="recommendations">
          <h3>Recomendacoes</h3>
          <ul>{current.recommendations.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </article>
      )}

      {skipped && <p className="qa-review-note">{t.skippedCorrection}</p>}

      {!alreadyCorrected && !skipped && (
        <div className="auto-correct-panel">
          <p className="ai-disclaimer">{t.autoCorrectHint}</p>
          <button type="button" className="primary" disabled={correcting} onClick={onAutoCorrect}>
            {correcting ? t.autoCorrecting : t.autoCorrect}
          </button>
        </div>
      )}
    </section>
  );
}

