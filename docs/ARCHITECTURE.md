# Frontend Architecture

## 1. Runtime

The SPA is served by nginx (`statline/web`, port 8080). In AKS the Ingress routes `/api` to the api Service and `/` to this image, so requests are same-origin and the API needs no CORS. Locally Vite proxies `/api` to `http://localhost:3000`.

**Runtime config and Sentry (D-07).** `index.html` loads `/config.js` before the app. The repo's `public/config.js` is empty, and in Kubernetes the chart mounts one per namespace, with `sentryDsn` and `sentryEnvironment`, so one image serves both environments. `src/lib/sentry.ts` starts `@sentry/react` only when a DSN is set, and `main.tsx` wraps the router in `Sentry.ErrorBoundary`. The Sentry release is `VITE_SENTRY_RELEASE`, the commit the bundle was built from (Dockerfile build arg). In CD, with the `SENTRY_AUTH_TOKEN` build secret, the build uploads hidden source maps under that release and deletes them from `dist/`. Repo settings: secret `SENTRY_AUTH_TOKEN`, variables `SENTRY_ORG` and `SENTRY_PROJECT` (default `statline-web`).

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
Types in `src/api/types.ts` mirror the backend responses documented in statline-infra `docs/api.md`. Endpoints used today: `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/ligas`, `GET /api/ligas/:id/posiciones`, `GET /api/partidos?fecha=&page=`, `GET /api/partidos/:id/boxscore`, `GET /api/jugadores?q=&deporte=&page=`, `GET /api/jugadores/:id`, `GET /api/pronosticos?deporte=&jornada=&page=`, `GET /api/proyecciones?jornada=&page=`, `GET /api/pronosticos/precision?deporte=`, `GET /api/proyecciones/precision?deporte=`, `GET /api/modelos?deporte=&tipo=`, the generation endpoints (`POST /api/pronosticos/generar`, `POST /api/proyecciones/generar`) and the ADMIN-only `POST /api/modelos/:id/activar` and `POST /api/modelos/reentrenar`.

Types for endpoints not implemented yet (listas, alertas, ingestas) are marked in `types.ts`.
Types in `src/api/types.ts` mirror the backend responses documented in statline-infra `docs/api.md`. Endpoints used today: `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/ligas`, `GET /api/ligas/:id/posiciones`, `GET /api/partidos?fecha=&page=`, `GET /api/partidos/:id/boxscore`, `GET /api/jugadores?q=&deporte=&page=`, `GET /api/jugadores/:id`, `GET /api/equipos`, and the owner-scoped watchlists and alerts (SL-47): `GET|POST /api/listas`, `GET|PUT|DELETE /api/listas/:id`, `POST /api/listas/:id/elementos`, `DELETE /api/listas/:id/elementos/:refId`, `GET|POST /api/alertas`, `PUT|DELETE /api/alertas/:id`.

Types for endpoints not implemented yet (promedios, tendencia, comparar, pronósticos, proyecciones, modelos, ingestas) are tentative and marked in `types.ts`.

Writes for lists and alerts: `ListaSeguimiento` mutations invalidate the `["listas"]` prefix (element changes only the one list); alert mutations invalidate `["alertas"]`. A 409 on adding an element means it is already in the list. 400 `VALIDATION_ERROR` details are kept on `ApiError.details` and mapped to form fields by `lib/errores.ts`.

## 6. Screens

- `/partidos/:id` (`features/partidos/BoxscorePage.tsx`): header with score and status, per-team stat tables and a Recharts top-5 leaders chart. Columns and metric keys per sport come from `features/partidos/metricas.ts`, which follows `statline-backend/schemas/*.schema.json`. The leaders metric is kept in `?metrica=`.
- `/jugadores/:id` (`features/jugadores/JugadorDetallePage.tsx`): profile, season averages table (`PromediosPanel`) and a Recharts line chart of the last 10 games for one metric (`TendenciaPanel`, metric kept in `?metrica=`). A "Comparar" link opens `/comparar?ids=<id>`. Metric lists per sport are shared with the boxscore (`features/partidos/metricas.ts`).
- `/comparar?ids=a,b[,c,d]` (`features/comparar/CompararPage.tsx`, lazy): selected players live in `?ids=`; the search uses `useJugadores` and, once a selection exists, only offers that sport. The radar (`CompararRadar.tsx`) plots each metric scaled 0 to 100 against the best value among the selected players (`normalizar.ts`); a table below shows the raw averages. API errors (e.g. players from different sports) are shown as they come. A teams tab is not built yet.

- `/pronosticos` (`features/pronosticos/PronosticosPage.tsx`): tabs in `?tab=partidos|jugadores|modelos`, sport in `?deporte=` (default basquetbol) and optional `?jornada=`. Partidos shows match probabilities as a stacked bar (no draw segment outside futbol), the expected score and the model's precision. Jugadores shows projected metrics (labels from `metricas.ts`) and MAE per target. Modelos (ADMIN only, tab hidden otherwise) lists models, activates one after confirmation and retrains per tipo. ANALISTA and ADMIN see the generation buttons. Prediction error codes (`NO_ACTIVE_MODEL`, `INSUFFICIENT_DATA`, `PREDICCIONES_UNAVAILABLE`) are shown as friendly text. Models whose version ends in `-synthetic` carry a "datos sintéticos" badge.

- `/listas` (`features/listas/ListasPage.tsx`): owner's watchlists with pagination (`?page=`) and a create form that opens the new list.
- `/listas/:id` (`features/listas/ListaDetallePage.tsx`): rename, delete (confirmed), elements with remove (confirmed), add a jugador through the search picker (`components/SelectorJugador.tsx`) or add a team from the team list.
- `/alertas` (`features/alertas/AlertasPage.tsx`): alerts with an activa switch (PUT `{activa}`), delete (confirmed) and a create form (`FormularioAlerta.tsx`) whose fields follow `tipo`. Rules live in `features/alertas/validacion.ts` and mirror the backend: LESION needs a jugador, INICIO_PARTIDO a jugador or equipo, UMBRAL a jugador, a metric of its sport (from `partidos/metricas.ts`), an operator and a number.

## 7. Styling

Tailwind utilities; three component classes in `index.css` (`card`, `btn`, `input`); one accent color per sport (`basquetbol`, `americano`, `futbol`); dark mode follows the OS.

## 7. CI/CD

- **CI** (`ci.yml`, every push and PR): lint, format, types, Vitest with the 70 % gate, production build, nginx image build, Trivy (fails on HIGH/CRITICAL).
- **CD** (`cd.yml`, pushes to `develop` and `main`, and `vX.Y.Z` tags): builds `linux/amd64` `statline/web`, pushes it to Docker Hub as `statline/web:<short-sha>` (7 chars) and, on tags, `statline/web:vX.Y.Z`, scans the pushed image with Trivy, then sends a `repository_dispatch` `bump-image` to `statline-iteso/statline-infra`.
- **Environment mapping:** `develop` → staging, `main` and tags → prod. Infra commits the tag into `gitops/charts/statline/values-<env>.yaml`; Argo CD syncs from there.
- **Dispatch payload:** `{"event_type":"bump-image","client_payload":{"env":"staging|prod","images":{"web":"<tag>"},"source_repo":"statline-iteso/statline-frontend","sha":"<full sha>"}}`.
- **Secrets:** `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (push), `INFRA_DISPATCH_TOKEN` (fine-grained PAT, `contents: write` on statline-infra, used only for the dispatch).
