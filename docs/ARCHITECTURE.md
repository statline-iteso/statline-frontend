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

Types in `src/api/types.ts` mirror the backend responses documented in statline-infra `docs/api.md`. Endpoints used today: `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/ligas`, `GET /api/ligas/:id/posiciones`, `GET /api/partidos?fecha=&page=`, `GET /api/partidos/:id/boxscore`, `GET /api/jugadores?q=&deporte=&page=`, `GET /api/jugadores/:id`, `GET /api/jugadores/:id/promedios?ultimos=`, `GET /api/jugadores/:id/tendencia?metrica=&n=`, `GET /api/jugadores/comparar?ids=` (2 to 4 players, same sport) and `GET /api/equipos/:id/forma`.

Hooks for these reads: `usePromedios`, `useTendencia` (needs a metric), `useComparacion` (enabled only with 2 to 4 ids, see `COMPARACION_MIN`/`COMPARACION_MAX`) and `useFormaEquipo`.

Types for endpoints not implemented yet (pronósticos, proyecciones, modelos, listas, alertas, ingestas) are tentative and marked in `types.ts`.

## 6. Screens

- `/partidos/:id` (`features/partidos/BoxscorePage.tsx`): header with score and status, per-team stat tables and a Recharts top-5 leaders chart. Columns and metric keys per sport come from `features/partidos/metricas.ts`, which follows `statline-backend/schemas/*.schema.json`. The leaders metric is kept in `?metrica=`.
- `/jugadores/:id` (`features/jugadores/JugadorDetallePage.tsx`): profile, season averages table (`PromediosPanel`) and a Recharts line chart of the last 10 games for one metric (`TendenciaPanel`, metric kept in `?metrica=`). A "Comparar" link opens `/comparar?ids=<id>`. Metric lists per sport are shared with the boxscore (`features/partidos/metricas.ts`).
- `/comparar?ids=a,b[,c,d]` (`features/comparar/CompararPage.tsx`, lazy): selected players live in `?ids=`; the search uses `useJugadores` and, once a selection exists, only offers that sport. The radar (`CompararRadar.tsx`) plots each metric scaled 0 to 100 against the best value among the selected players (`normalizar.ts`); a table below shows the raw averages. API errors (e.g. players from different sports) are shown as they come. A teams tab is not built yet.

## 7. Styling

Tailwind utilities; three component classes in `index.css` (`card`, `btn`, `input`); one accent color per sport (`basquetbol`, `americano`, `futbol`); dark mode follows the OS.
