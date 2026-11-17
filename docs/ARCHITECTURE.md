# Frontend Architecture

## 1. Runtime

The SPA is served by nginx (`statline/web`, port 8080). In AKS the Ingress routes `/api` to the api Service and `/` to this image, so requests are same-origin and the API needs no CORS. Locally Vite proxies `/api` to `http://localhost:3000`.

## 2. Routing

`src/app/routes.tsx` is the single route table. Every screen is lazy-loaded. `/login` is public; everything else is wrapped in `RequireAuth` + `Layout`. Unknown paths render `NoEncontrado`.

## 3. Data fetching

- `api/client.ts` — `createApiClient({ tokens, onSessionExpired, fetchFn })`: adds `Authorization`, serializes query params (dropping empty ones), maps error bodies to `ApiError(status, code, message)`, and on a 401 calls `POST /api/auth/refresh` once (one shared in-flight refresh) before retrying; if that fails it clears the session.
- `api/queries.ts` — one hook per read, with query keys in `keys`. `staleTime` 60 s (data only changes when CronJobs run). Retries: never on 4xx, at most twice otherwise. Lists use `keepPreviousData` so pagination doesn't flash.

## 4. Auth

`AuthProvider` owns the token store (localStorage, every access guarded) and the current user. `login()` stores tokens and user; `logout()` clears them and the query cache. Tokens in localStorage are an accepted trade-off for a course project (D-03).

## 5. API contract

Types in `src/api/types.ts` mirror the backend responses documented in statline-infra `docs/api.md`. Endpoints used today: `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/ligas`, `GET /api/ligas/:id/posiciones`, `GET /api/partidos?fecha=&page=`, `GET /api/jugadores?q=&deporte=&page=`, `GET /api/jugadores/:id`.

## 6. Styling

Tailwind utilities; three component classes in `index.css` (`card`, `btn`, `input`); one accent color per sport (`basquetbol`, `americano`, `futbol`); dark mode follows the OS.

## 7. CI/CD

- **CI** (`ci.yml`, every push and PR): lint, format, types, Vitest with the 70 % gate, production build, nginx image build, Trivy (fails on HIGH/CRITICAL).
- **CD** (`cd.yml`, pushes to `develop` and `main`, and `vX.Y.Z` tags): builds `linux/amd64` `statline/web`, pushes it to Docker Hub as `statline/web:<short-sha>` (7 chars) and, on tags, `statline/web:vX.Y.Z`, scans the pushed image with Trivy, then sends a `repository_dispatch` `bump-image` to `statline-iteso/statline-infra`.
- **Environment mapping:** `develop` → staging, `main` and tags → prod. Infra commits the tag into `gitops/charts/statline/values-<env>.yaml`; Argo CD syncs from there.
- **Dispatch payload:** `{"event_type":"bump-image","client_payload":{"env":"staging|prod","images":{"web":"<tag>"},"source_repo":"statline-iteso/statline-frontend","sha":"<full sha>"}}`.
- **Secrets:** `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (push), `INFRA_DISPATCH_TOKEN` (fine-grained PAT, `contents: write` on statline-infra, used only for the dispatch).
