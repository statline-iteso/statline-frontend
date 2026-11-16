# statline-frontend · Backlog

This repo's slice of the project backlog. The full backlog (61 issues, 277 points) and the board live in [statline-infra docs/BACKLOG.md](https://github.com/statline-iteso/statline-infra/blob/develop/docs/BACKLOG.md).

**Progress:** 6 of 10 issues done · 22 of 39 points.

**How to read it**

- ✅ done in the first half · ⏳ pending (second half, Ian Rodríguez).
- One issue = one PR (`feature/<issue>-<desc>` → `develop`, squash merge, `Closes #N`).
- Board columns: Backlog → Listo para trabajar → En progreso → En revisión → Terminado.

## E6 · Frontend

### ✅ [SL-40](https://github.com/statline-iteso/statline-frontend/issues/1) · Proyecto React 18 + Vite + TypeScript + TailwindCSS con layout y rutas

**Sprint:** S4 · **Points:** 3 · **Priority:** Alta

**Acceptance criteria**

- [x] Vite, TypeScript strict, Tailwind, React Router con rutas lazy
- [x] Layout con navegación, página 404 y manejo de errores de ruta

### ✅ [SL-41](https://github.com/statline-iteso/statline-frontend/issues/2) · Cliente API, TanStack Query y sesión (login, refresh, rutas protegidas)

**Sprint:** S4 · **Points:** 5 · **Priority:** Crítica

**Acceptance criteria**

- [x] Cliente tipado con renovación automática del access token
- [x] TanStack Query con reintentos e invalidación
- [x] Login, logout y `RequireAuth`

### ✅ [SL-42](https://github.com/statline-iteso/statline-frontend/issues/3) · Vistas de jugadores: búsqueda, filtro por deporte y detalle

**Sprint:** S4 · **Points:** 4 · **Priority:** Alta

**Acceptance criteria**

- [x] Lista paginada con búsqueda (?q=) y filtro por deporte
- [x] Detalle del jugador con equipo y estatus

### ✅ [SL-43](https://github.com/statline-iteso/statline-frontend/issues/4) · Vistas de ligas y partidos: posiciones y calendario por fecha

**Sprint:** S4 · **Points:** 4 · **Priority:** Alta

**Acceptance criteria**

- [x] Tabla de posiciones por liga
- [x] Partidos por fecha con marcador y estatus

### ⏳ [SL-44](https://github.com/statline-iteso/statline-frontend/issues/5) · Construir componentes visuales de boxscore con TailwindCSS y Recharts

**Sprint:** S4 · **Points:** 5 · **Priority:** Media

**Acceptance criteria**

- [ ] Tabla de boxscore por equipo con columnas según el deporte
- [ ] Gráfica de barras de líderes del partido (Recharts)

### ⏳ [SL-45](https://github.com/statline-iteso/statline-frontend/issues/6) · Comparación de jugadores y equipos

**Sprint:** S4 · **Points:** 4 · **Priority:** Media

**Acceptance criteria**

- [ ] Selector de 2 a 4 jugadores y gráfica de radar con promedios

### ⏳ [SL-46](https://github.com/statline-iteso/statline-frontend/issues/7) · Vistas de pronósticos y proyecciones

**Sprint:** S5 · **Points:** 4 · **Priority:** Media

**Acceptance criteria**

- [ ] Probabilidades por partido de la jornada y proyecciones por jugador

### ⏳ [SL-47](https://github.com/statline-iteso/statline-frontend/issues/8) · Listas de seguimiento y alertas

**Sprint:** S5 · **Points:** 4 · **Priority:** Media

**Acceptance criteria**

- [ ] CRUD de listas y elementos; configuración de alertas por lesión, umbral o inicio

### ✅ [SL-48](https://github.com/statline-iteso/statline-frontend/issues/9) · Dockerfile con nginx y pruebas con Vitest (cobertura ≥ 70 %)

**Sprint:** S4 · **Points:** 3 · **Priority:** Media

**Acceptance criteria**

- [x] Build multi-etapa servido por nginx no root, con fallback de SPA
- [x] Vitest + Testing Library con umbral de cobertura del 70 %

## E7 · Pipeline de CI/CD

### ✅ [SL-50](https://github.com/statline-iteso/statline-frontend/issues/10) · Workflow ci.yml del frontend

**Sprint:** S3 · **Points:** 3 · **Priority:** Alta

**Acceptance criteria**

- [x] Lint, tipos, Vitest con cobertura, build y build de la imagen
