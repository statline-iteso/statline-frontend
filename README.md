# StatLine — Frontend

**StatLine** is a web platform for unified sports statistics and forecasts across **NBA**, **NFL** and **Liga MX**. This repository is the single-page app: standings, games by date, player search and profiles, and _(planned)_ box scores, comparisons, forecasts, watchlists and alerts.

Stack: **React 18**, **Vite**, **TypeScript**, **TailwindCSS**, **TanStack Query**, **Recharts**, React Router. Served by unprivileged **nginx** in the `statline/web` image.

## Related Repositories

- [statline-backend](https://github.com/statline-iteso/statline-backend): the REST API this app consumes.
- [statline-infra](https://github.com/statline-iteso/statline-infra): Terraform, GitOps, and the project-wide docs ([API design](https://github.com/statline-iteso/statline-infra/blob/develop/docs/api.md)).

## Documentation

- [AGENTS.md](AGENTS.md): Overview, scope, stack and rules for contributors and AI agents.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Structure, routing, data fetching, auth and the API contract.
- [docs/CONVENTIONS.md](docs/CONVENTIONS.md): Coding, styling and testing guidelines.
- [docs/DECISIONS.md](docs/DECISIONS.md): Decisions and future work.
- [docs/BACKLOG.md](docs/BACKLOG.md): This repo's issues.

## Quickstart

```bash
pnpm install
pnpm dev                 # http://localhost:5173 — /api is proxied to http://localhost:3000
                         # (start the API from statline-backend first)
pnpm test                # Vitest + Testing Library
pnpm test:coverage       # fails under 70 %
pnpm lint && pnpm typecheck && pnpm format:check
pnpm build               # dist/
```

## Docker

```bash
docker build -t statline/web:local .
docker run --rm -p 8080:8080 statline/web:local     # /healthz, SPA fallback on every route
```

In AKS the Ingress sends `/api` to the api Service and everything else to this image, so the app always calls the API on the same origin.

## Screens

| Route                    | Screen                                         | Status                               |
| ------------------------ | ---------------------------------------------- | ------------------------------------ |
| `/login`                 | Sign in                                        | ✅                                   |
| `/ligas`                 | League tabs and standings table                | ✅                                   |
| `/partidos?fecha=`       | Games of a day with score and status           | ✅                                   |
| `/jugadores?q=&deporte=` | Player search with sport filter and pagination | ✅                                   |
| `/jugadores/:id`         | Player profile                                 | ✅ (averages and trend: SL-27/SL-45) |
| `/partidos/:id`          | Box score with charts                          | 🕓 SL-44                             |
| `/comparar`              | Player/team comparison                         | 🕓 SL-45                             |
| `/pronosticos`           | Forecasts and projections                      | 🕓 SL-46                             |
| `/listas`, `/alertas`    | Watchlists and alerts                          | 🕓 SL-47                             |

## CI/CD

- `ci.yml` runs on every push and PR. `cd.yml` runs on pushes to `develop` and `main` and on `vX.Y.Z` tags: it pushes `statline/web` to Docker Hub (7-char SHA, plus `vX.Y.Z` on tags), scans it with Trivy and asks statline-infra to deploy the new tag (`develop` → staging, `main` and tags → prod).
- Required repository secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `INFRA_DISPATCH_TOKEN` (fine-grained PAT with `contents: write` on `statline-iteso/statline-infra`).
