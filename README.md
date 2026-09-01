# 🛡️ QAVeil AI

> **AI-assisted Quality Engineering platform for requirement analysis, risk assessment, test design, traceability and Playwright automation.**

QAVeil AI, created by **Marco Aurélio Gomes**, transforms product requirements into structured QA artifacts while keeping human review and provenance visible.

> **AI should assist QA reasoning — not replace it.**

## Pipeline

```text
Product / Project Context → Requirement → Analysis → Risk → Test Cases
→ Coverage → QA Judge → Auto Correction → Final Review
→ Traceability Matrix → Playwright Generation
```

## Features

- Requirement analysis: behaviors, actors, business rules, dependencies, ambiguities, gaps and PO questions.
- Risk analysis, detailed Test Cases, Gherkin, Coverage Summary and Regression Impact.
- QA Judge, limited auto-correction cycles and final review.
- Projects with persistent product context, documentation and confirmed rules.
- Provenance and `POTENTIAL_REQUIREMENT_CONFLICT` reporting.
- Playwright TypeScript generation with safe placeholders; no invented credentials, URLs, endpoints or selectors.
- Markdown/PDF export from persisted snapshots, without a new AI request.

## Traceability Matrix

The deterministic matrix connects requirement behaviors and business rules to Test Cases, Gherkin and Playwright status.

```text
Requirement / Rule → Test Case → Gherkin → Playwright status
```

It exposes `REQ-*` / `BR-*` IDs, coverage metrics, filters, provenance and uncovered items.

```text
COVERED
PARTIALLY_COVERED
NOT_COVERED
```

Invalid references are discarded rather than creating phantom items. Existing snapshots use conservative deterministic matching. `PLAYWRIGHT_GENERATED` means code was generated in the current view; it does not mean automated execution has been confirmed.

> Traceability Matrix export integration is still in progress.

## Architecture

```text
Presentation: Next.js / React
Application: use cases, builders and QA flows
Domain: AI contracts and QA concepts
Infrastructure: Gemini, deterministic providers and Prisma
```

```text
AIProvider: GeminiAIProvider | DeterministicAIProvider
PlaywrightGenerator: GeminiPlaywrightGenerator | DeterministicPlaywrightGenerator
```

## Local development

Requirements: Node.js, npm and Docker Desktop.

```bash
git clone https://github.com/MarcoQATst/qaveil-ai.git
cd qaveil-ai
npm install
cp .env.example .env
docker compose up -d
npx prisma db push
npm run dev
```

Open `http://localhost:3000`.

### Environment

- `DATABASE_URL`: PostgreSQL connection string.
- `AI_PROVIDER`: `deterministic` or `gemini`.
- `GEMINI_API_KEY`: required only for Gemini and read server-side.

Never commit `.env`, credentials or API keys.

## Validation

```bash
npm test
npm run typecheck
npm run build
```

Tests do not depend on Gemini, internet, quota or production keys. Deterministic providers and mocks keep them reproducible.

## Roadmap

Implemented: analysis, risk, Test Cases, Gherkin, QA Judge, correction, projects/context, Playwright generation, exports and Traceability Matrix UI.

Planned: traceability export integration, advanced Playwright architecture, semantic retrieval/RAG, authentication, workspaces, integrations and Playwright execution.

## Creator & maintainer

**Marco Aurélio Gomes** — Creator, Developer and QA Engineer behind QAVeil AI.

- LinkedIn: <https://www.linkedin.com/in/marcoaurelioqa>
- GitHub: <https://github.com/MarcoQATst>

Copyright © 2026 Marco Aurélio Gomes. QAVeil AI is an independent project under active development.
