# StatLine — Frontend · Agent Context

> Read this first. Deeper docs: `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`, `docs/DECISIONS.md`.
> The API contract lives in statline-infra `docs/api.md` and the backend's ARCHITECTURE; if a response shape changes, update `src/api/types.ts` and tell the backend owner.

## 1. The project in one paragraph

**StatLine** unifies statistics and forecasts for **NBA**, **NFL** and **Liga MX**: standings, calendars, box scores, player comparisons, match-outcome probabilities and player projections, plus personal watchlists and alerts. Data comes from scheduled ingestion into PostgreSQL; this SPA never calls external sports APIs. Not a fantasy or betting product.

ITESO final project, Fall 2026: **Juan Pablo González** (backend, frontend) and **Ian Rodríguez** (infra, predictions, deployment).

## 2. Stack

React 18 · Vite 5 · TypeScript strict · TailwindCSS 3 · TanStack Query 5 · React Router 6 · Recharts · Vitest + Testing Library · ESLint + Prettier · nginx-unprivileged image.

## 3. Commands

```bash
pnpm dev | build | test | test:coverage | lint | typecheck | format
```

## 4. Layout

```
src/
├── api/          client.ts (fetch + token refresh) · queries.ts (TanStack hooks + keys) · types.ts
├── app/          routes.tsx · Layout · NoEncontrado · query-client.ts
├── auth/         AuthProvider · RequireAuth · useAuth
├── components/   ui.tsx (DeporteTag, Cargando, ErrorMensaje, Vacio, Paginacion)
├── features/     login · ligas · partidos · jugadores   (one folder per screen group)
├── lib/          format.ts
└── test/         setup · render helpers (fake fetch, renderApp)
```

## 5. Rules for agents

1. Server data only through TanStack Query hooks in `api/queries.ts`; no `fetch` in components.
2. Every screen handles loading, error and empty states.
3. Filters and pagination live in the URL (`useSearchParams`) so views are shareable.
4. Tests come with the change; coverage ≥ 70 %.
5. Branches `feature/<issue>-<desc>` from `develop`, squash merge, `Closes #N`, Conventional Commits.
6. **No AI attribution.** Never add yourself as a co-author: no `Co-Authored-By` trailers in commits and no "Generated with …" lines in PR descriptions or issues.
