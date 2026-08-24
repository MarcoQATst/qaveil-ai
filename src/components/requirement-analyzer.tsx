"use client";

import { useState } from "react";
import type { AnalysisResponse } from "../schemas/analysis";

type Locale = "pt" | "en";
const content = {
  pt: { title: "Revele o que seu requisito não conta.", subtitle: "Transforme requisitos em riscos, perguntas e cenários antes que virem defeitos.", requirement: "Requisito", context: "Contexto adicional", analyze: "Analisar requisito", analyzing: "Analisando…", rules: "Regras de negócio", ambiguities: "Ambiguidades", missing: "Informações ausentes", questions: "Perguntas para o Product Owner", placeholder: "Como cliente, quero alterar meu endereço de entrega antes que o pedido seja despachado." },
  en: { title: "Reveal what your requirements don't tell you.", subtitle: "Turn requirements into risks, questions, and scenarios before they become defects.", requirement: "Requirement", context: "Additional context", analyze: "Analyze requirement", analyzing: "Analyzing…", rules: "Business rules", ambiguities: "Ambiguities", missing: "Missing information", questions: "Questions for the Product Owner", placeholder: "As a customer, I want to change my shipping address before my order is dispatched." },
} as const;

export function RequirementAnalyzer() {
  const [locale, setLocale] = useState<Locale>("pt");
  const [requirement, setRequirement] = useState<string>(content.pt.placeholder);
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const t = content[locale];
  const selectLanguage = (next: Locale) => { setLocale(next); setRequirement(content[next].placeholder); setResult(null); setFile(null); };

  const handleFile = async (selectedFile: File) => {
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("O arquivo excede o limite de 5MB.");
      return;
    }
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt', 'md'].includes(ext || '')) {
      setError("Formato não suportado. Envie PDF, DOCX, TXT ou MD.");
      return;
    }
    setError(null);
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao processar o arquivo.");
      
      setRequirement(data.text);
      setFile(selectedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsLoading(true); setError(null);
    try {
      const response = await fetch("/api/analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requirement, additionalContext, locale }) });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(typeof body === "object" && body && "error" in body ? String(body.error) : "Analysis failed.");
      setResult(body as AnalysisResponse);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Analysis failed."); } finally { setIsLoading(false); }
  }
  return <main className="workspace">
    <aside className="sidebar"><div className="brand">QA<span>Veil</span> <small>AI</small></div><p>WORKSPACE</p><button className="active">Nova análise</button><button>Histórico</button><button>Estratégia de QA</button><small className="provider-status">● Provider local ativo</small></aside>
    <section className="surface"><header><p>QUALITY ENGINEERING INTELLIGENCE</p><div className="language"><button className={locale === "pt" ? "selected" : ""} onClick={() => selectLanguage("pt")}>PT</button><button className={locale === "en" ? "selected" : ""} onClick={() => selectLanguage("en")}>EN</button></div></header><div className="content"><h1>{t.title}</h1><p className="lead">{t.subtitle}</p>
      <div className="analysis-layout">
        <form className="input-card" onSubmit={onSubmit}>
          <div 
            className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          >
            {isUploading ? (
              <p>Extraindo texto...</p>
            ) : file ? (
              <div className="file-loaded">
                <span>📄 {file.name}</span>
                <button type="button" onClick={() => { setFile(null); setRequirement(""); }}>Remover</button>
              </div>
            ) : (
              <label className="upload-label">
                <input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} hidden />
                <span>Arraste um documento (PDF, DOCX, TXT, MD) ou <b>clique para selecionar</b></span>
              </label>
            )}
          </div>
          <label htmlFor="requirement">{t.requirement}</label>
          <textarea id="requirement" data-testid="requirement-input" value={requirement} onChange={(event) => setRequirement(event.target.value)} rows={5} />
          <label htmlFor="context">{t.context} <small>(opcional)</small></label>
          <input id="context" value={additionalContext} onChange={(event) => setAdditionalContext(event.target.value)} />
          <button className="primary" type="submit" data-testid="analyze-button" disabled={isLoading}>{isLoading ? t.analyzing : t.analyze}</button>
        </form>
        <section className="risk-card"><span>RISK SCORE</span><div><strong>{result?.analysis.risk.score ?? "—"}</strong><b>{result?.analysis.risk.level ?? "PENDING"}</b></div><p>{result?.analysis.risk.rationale ?? "A análise de risco aparece após avaliar o requisito."}</p><i style={{ width: `${(result?.analysis.risk.score ?? 0) * 5}%` }} /></section></div>
      {error && <p className="error" role="alert">{error}</p>}{result ? <AnalysisResult result={result} t={t} /> : <div className="empty"><b>Análise pronta para começar</b><p>Os riscos, ambiguidades e perguntas estratégicas aparecerão aqui.</p></div>}</div></section>
  </main>;
}
function ScenarioCard({ scenario }: { scenario: AnalysisResponse["analysis"]["scenarios"][number] }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(scenario.gherkin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="scenario-card">
      <header className="scenario-card-header">
        <div className="scenario-card-meta">
          <small>{scenario.id} · {scenario.category} {scenario.type ? `· ${scenario.type}` : ''}</small>
          <div className="scenario-card-badges">
            <span className={`badge badge-priority badge-${scenario.priority.toLowerCase()}`}>{scenario.priority}</span>
            <span className="badge badge-automation">{scenario.automation.replaceAll("_", " ")}</span>
          </div>
        </div>
        <b className="scenario-card-title">{scenario.title}</b>
        <p className="scenario-card-description">{scenario.description}</p>
      </header>
      <div className="scenario-card-body">
        <div className="scenario-section">
          <h4>Pré-requisitos</h4>
          <ul>
            {scenario.prerequisites.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
        {scenario.testData && scenario.testData !== "N/A" && (
          <div className="scenario-section">
            <h4>Dados de teste</h4>
            <div className="test-data-block">{scenario.testData}</div>
          </div>
        )}
        <div className="gherkin-wrapper">
          <div className="gherkin-header">
            <span>Gherkin</span>
            <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy} aria-label="Copy Gherkin">
              {copied ? 'Copied!' : 'Copy Gherkin'}
            </button>
          </div>
          <pre>{scenario.gherkin}</pre>
        </div>
      </div>
    </article>
  );
}

function AnalysisResult({ result, t }: { result: AnalysisResponse; t: typeof content.pt | typeof content.en }) {
  const groups = [[t.rules, result.analysis.businessRules], [t.ambiguities, result.analysis.ambiguities], [t.missing, result.analysis.missingInformation], [t.questions, result.analysis.questionsForPo]] as const;
  return (
    <section className="results" data-testid="analysis-result">
      <p className="result-provider">Modo: {result.provider}</p>
      <h2>Análise do requisito</h2>
      <p className="summary">{result.analysis.summary}</p>
      <div className="coverage">
        <h3>Cobertura estimada</h3>
        {Object.entries(result.analysis.coverage).filter(([key]) => key !== "lowCoverageAreas").map(([key, value]) => (
          <div key={key}><span>{key}</span><i><b style={{ width: `${value}%` }} /></i><small>{value}%</small></div>
        ))}
      </div>
      <div className="result-grid">
        {groups.map(([title, items]) => (
          <article key={title}><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>
        ))}
      </div>
      <section className="hidden-risks">
        <h3>Riscos ocultos</h3>
        {result.analysis.hiddenRisks.map((item) => (
          <article key={item.risk}><b>{item.risk}</b><span>{item.priority}</span><p>{item.whyItMatters}</p><small>Teste sugerido: {item.suggestedTest}</small></article>
        ))}
      </section>
      <section className="scenario-list">
        <h3>Cenários de teste</h3>
        {result.analysis.scenarios.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </section>
      <section className="deliverables">
        <article>
          <h3>Edge cases</h3>
          {result.analysis.edgeCases.map((item) => (
            <p key={item.value}><b>{item.value}</b> · {item.reason}</p>
          ))}
        </article>
        <article>
          <h3>Gherkin</h3>
          {result.analysis.gherkin.map((item) => (
            <details key={item.title}><summary>{item.title}</summary><pre>{item.content}</pre></details>
          ))}
        </article>
      </section>
    </section>
  );
}
