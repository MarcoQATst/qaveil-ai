# QAVeil AI

> Reveal what your requirements don't tell you.

QAVeil AI is a Quality Engineering assistant that turns a requirement into structured QA intelligence: risk assessment, hidden risks, test scenarios, edge cases, Gherkin, coverage estimates, and automation recommendations.

## MVP capabilities

- Requirement analysis with ambiguities and questions for Product Owners
- Risk score (impact, probability, complexity, and detectability)
- Hidden-risk discovery for concurrency, retries, integrations, and authorization
- Positive, negative, boundary, security, integration, and regression scenarios
- Edge-case detection, Gherkin examples, and estimated coverage
- Portuguese-first UI with an English switch

## Architecture

`UI → API/application service → QA domain logic → AIProvider → persistence`

The `AIProvider` interface keeps QA logic independent of an LLM vendor. The MVP ships with a deterministic provider so it can be developed and tested without an API key.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run test
npm run typecheck
npm run build
```

## Docker

From a terminal with Docker access:

```bash
docker-compose up --build
```

The Compose stack starts the app and PostgreSQL. The Codex process may not have permission to run Docker locally; run this command from the user terminal when needed.

## Environment

- `DATABASE_URL`: PostgreSQL connection string
- `AI_PROVIDER`: `deterministic` for the current MVP
- `OPENAI_API_KEY`: reserved for a future LLM provider; never commit it

## AI safety

Requirements are handled as data, never executable instructions. The API validates its input and validates the provider's structured output with Zod before it is returned to the UI.

## Roadmap

Next phases include persisted analysis history, a live LLM provider, exports, authentication, and Playwright code generation.
