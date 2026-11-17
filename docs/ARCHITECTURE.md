# Frontend Architecture

## 1. Runtime

The SPA is served by nginx (`statline/web`, port 8080). In AKS the Ingress routes `/api` to the api Service and `/` to this image, so requests are same-origin and the API needs no CORS. Locally Vite proxies `/api` to `http://localhost:3000`.

## 2. Routing

`src/app/routes.tsx` is the single route table. Every screen is lazy-loaded. `/login` is public; everything else is wrapped in `RequireAuth` + `Layout`. Unknown paths render `NoEncontrado`.

## 3. Data fetching

- `api/client.ts` — `createApiClient({ tokens, onSessionExpired, fetchFn })`: `get`, `post`, `put`, `patch` and `delete` (204 resolves to `undefined`). Adds `Authorization`, serializes query params (dropping empty ones), maps error bodies to `ApiError(status, code, message)`, and on a 401 calls `POST /api/auth/refresh` once (one shared in-flight refresh) before retrying; if that fails it clears the session.
- `api/queries.ts` — one hook per read, with query keys in `keys`. `staleTime` 60 s (data only changes when CronJobs run). Retries: never on 4xx, at most twice otherwise. Lists use `keepPreviousData` so pagination doesn't flash.
- Writes go through `useApiMutation(fn, invalidate)`: `fn` receives the shared client, and the given query keys (static or derived from the variables) are invalidated on success.

## 4. Auth

`AuthProvider` owns the token store (localStorage, every access guarded) and the current user. `login()` stores tokens and user; `logout()` clears them and the query cache. Tokens in localStorage are an accepted trade-off for a course project (D-03).

## 5. API contract

Types in `src/api/types.ts` mirror the backend responses documented in statline-infra `docs/api.md`. Endpoints used today: `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/ligas`, `GET /api/ligas/:id/posiciones`, `GET /api/partidos?fecha=&page=`, `GET /api/partidos/:id/boxscore`, `GET /api/jugadores?q=&deporte=&page=`, `GET /api/jugadores/:id`, `GET /api/pronosticos?deporte=&jornada=&page=`, `GET /api/proyecciones?jornada=&page=`, `GET /api/pronosticos/precision?deporte=`, `GET /api/proyecciones/precision?deporte=`, `GET /api/modelos?deporte=&tipo=`, the generation endpoints (`POST /api/pronosticos/generar`, `POST /api/proyecciones/generar`) and the ADMIN-only `POST /api/modelos/:id/activar` and `POST /api/modelos/reentrenar`.

Types for endpoints not implemented yet (listas, alertas, ingestas) are marked in `types.ts`.

## 6. Screens

- `/partidos/:id` (`features/partidos/BoxscorePage.tsx`): header with score and status, per-team stat tables and a Recharts top-5 leaders chart. Columns and metric keys per sport come from `features/partidos/metricas.ts`, which follows `statline-backend/schemas/*.schema.json`. The leaders metric is kept in `?metrica=`.

- `/pronosticos` (`features/pronosticos/PronosticosPage.tsx`): tabs in `?tab=partidos|jugadores|modelos`, sport in `?deporte=` (default basquetbol) and optional `?jornada=`. Partidos shows match probabilities as a stacked bar (no draw segment outside futbol), the expected score and the model's precision. Jugadores shows projected metrics (labels from `metricas.ts`) and MAE per target. Modelos (ADMIN only, tab hidden otherwise) lists models, activates one after confirmation and retrains per tipo. ANALISTA and ADMIN see the generation buttons. Prediction error codes (`NO_ACTIVE_MODEL`, `INSUFFICIENT_DATA`, `PREDICCIONES_UNAVAILABLE`) are shown as friendly text. Models whose version ends in `-synthetic` carry a "datos sintéticos" badge.

## 7. Styling

Tailwind utilities; three component classes in `index.css` (`card`, `btn`, `input`); one accent color per sport (`basquetbol`, `americano`, `futbol`); dark mode follows the OS.
