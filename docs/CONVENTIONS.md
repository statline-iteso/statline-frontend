# Frontend Conventions

- **TypeScript strict**, named exports, components in PascalCase files, hooks `useX`.
- **Feature folders** under `src/features/<area>/`; shared UI in `src/components/`; pure helpers in `src/lib/`.
- **Data:** hooks in `api/queries.ts` only; keys from `keys`; never `fetch` in components.
- **State in the URL** for filters, search and pagination.
- **States:** every data view renders `Cargando`, `ErrorMensaje` or `Vacio` as appropriate.
- **Accessibility:** inputs have labels, interactive elements are buttons or links, tables have headers, status messages use `role="status"`/`role="alert"`.
- **Styling:** Tailwind utilities; Prettier sorts classes (`prettier-plugin-tailwindcss`).
- **Tests:** Vitest + Testing Library through `renderApp()` (real routes, fake `fetch`); assert what the user sees. Coverage ≥ 70 %.
- **Git:** `feature/<issue>-<desc>` from `develop`, Conventional Commits, squash merge, `Closes #N`. **No AI attribution** in commits, PRs or issues.
