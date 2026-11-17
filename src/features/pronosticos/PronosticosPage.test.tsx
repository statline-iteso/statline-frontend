import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  Deporte,
  ModeloPrediccion,
  PartidoRef,
  PrecisionProyeccion,
  PrecisionResultado,
  PronosticoPartido,
  ProyeccionJugador,
  Usuario,
} from "../../api/types";
import { fakeFetch, renderApp, USUARIO } from "../../test/render";
import { ProbBarra } from "./ProbBarra";

const ANALISTA: Usuario = { ...USUARIO, id: "u2", nombre: "Luis", rol: "ANALISTA" };
const ADMIN: Usuario = { ...USUARIO, id: "u3", nombre: "Root", rol: "ADMIN" };

const partido = (over: Partial<PartidoRef> = {}): PartidoRef => ({
  id: "p1",
  fecha: "2026-11-20T02:00:00Z",
  jornada: 8,
  estatus: "PROGRAMADO",
  marcadorLocal: null,
  marcadorVisita: null,
  local: { id: "e1", nombre: "Denver Nuggets", abreviatura: "DEN" },
  visita: { id: "e2", nombre: "Los Angeles Lakers", abreviatura: "LAL" },
  ...over,
});

const modelo = (deporte: Deporte, over: Partial<PronosticoPartido["modelo"]> = {}) => ({
  id: "m1",
  deporte,
  tipo: "RESULTADO_PARTIDO" as const,
  version: "v1.0.0",
  nombreMetrica: "log_loss",
  metricaError: 0.932,
  activo: true,
  ...over,
});

const pronostico = (over: Partial<PronosticoPartido> = {}): PronosticoPartido => ({
  id: "pr1",
  partidoId: "p1",
  modeloId: "m1",
  probLocal: 0.62,
  probEmpate: 0,
  probVisita: 0.38,
  marcadorEsperadoLocal: 112,
  marcadorEsperadoVisita: 109,
  generadoEn: "2026-11-16T10:00:00Z",
  partido: partido(),
  modelo: modelo("BASQUETBOL"),
  ...over,
});

const lista = <T,>(data: T[]) => ({ data, total: data.length, page: 1, pageSize: 20 });

const precisionRes = (over: Partial<PrecisionResultado["precision"]> = {}, version = "v1.0.0") => ({
  deporte: "BASQUETBOL",
  tipo: "RESULTADO_PARTIDO",
  modelo: { id: "m1", version, nombreMetrica: "log_loss", metricaError: 0.877 },
  precision: { n: 150, aciertos: 92, accuracy: 0.613, logLoss: 0.932, ...over },
});

describe("probability bar", () => {
  it("shows every percentage and no draw segment for basquetbol", () => {
    render(
      <ProbBarra
        equipoLocal="DEN"
        equipoVisita="LAL"
        probLocal={0.62}
        probEmpate={0}
        probVisita={0.38}
        conEmpate={false}
      />,
    );
    const barra = screen.getByRole("img", { name: "Probabilidades: DEN 62%, LAL 38%" });
    expect(barra.querySelector("[data-testid='segmento-empate']")).toBeNull();
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
    expect(screen.queryByText("Empate")).not.toBeInTheDocument();
  });

  it("adds a draw segment for futbol", () => {
    render(
      <ProbBarra
        equipoLocal="AME"
        equipoVisita="GDL"
        probLocal={0.5}
        probEmpate={0.25}
        probVisita={0.25}
        conEmpate
      />,
    );
    expect(
      screen.getByRole("img", { name: "Probabilidades: AME 50%, Empate 25%, GDL 25%" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Empate")).toBeInTheDocument();
    expect(screen.getAllByText("25%")).toHaveLength(2);
  });
});

describe("partidos tab", () => {
  it("defaults to basquetbol and draws the probability bars without a draw", async () => {
    const fetchFn = fakeFetch({
      "GET /api/pronosticos": (url) => ({
        body: url.searchParams.get("deporte") === "BASQUETBOL" ? lista([pronostico()]) : lista([]),
      }),
      "GET /api/pronosticos/precision": () => ({ body: precisionRes() }),
    });
    renderApp({ path: "/pronosticos", fetchFn });

    expect(
      await screen.findByRole("heading", { name: "Pronósticos por partido" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Deporte")).toHaveValue("BASQUETBOL");
    expect(
      await screen.findByRole("img", { name: "Probabilidades: DEN 62%, LAL 38%" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Marcador esperado:").parentElement).toHaveTextContent("112 – 109");
    expect(screen.getByRole("link", { name: "Ver partido" })).toHaveAttribute(
      "href",
      "/partidos/p1",
    );
  });

  it("shows the draw segment for futbol", async () => {
    const fetchFn = fakeFetch({
      "GET /api/pronosticos": (url) =>
        url.searchParams.get("deporte") === "FUTBOL"
          ? {
              body: lista([
                pronostico({
                  probLocal: 0.5,
                  probEmpate: 0.25,
                  probVisita: 0.25,
                  partido: partido({
                    local: { id: "e1", nombre: "América", abreviatura: "AME" },
                    visita: { id: "e2", nombre: "Chivas", abreviatura: "GDL" },
                  }),
                  modelo: modelo("FUTBOL"),
                }),
              ]),
            }
          : { body: lista([]) },
      "GET /api/pronosticos/precision": () => ({
        body: { ...precisionRes(), deporte: "FUTBOL" },
      }),
    });
    renderApp({ path: "/pronosticos?deporte=FUTBOL", fetchFn });
    expect(
      await screen.findByRole("img", { name: "Probabilidades: AME 50%, Empate 25%, GDL 25%" }),
    ).toBeInTheDocument();
  });

  it("shows the precision card and the synthetic badge", async () => {
    const fetchFn = fakeFetch({
      "GET /api/pronosticos": () => ({
        body: lista([
          pronostico({ modelo: modelo("BASQUETBOL", { version: "v0.3.0-synthetic" }) }),
        ]),
      }),
      "GET /api/pronosticos/precision": () => ({
        body: precisionRes({}, "v0.3.0-synthetic"),
      }),
    });
    renderApp({ path: "/pronosticos", fetchFn });
    const precision = await screen.findByRole("region", { name: "Precisión del modelo" });
    expect(within(precision).getByText("61%")).toBeInTheDocument();
    expect(within(precision).getByText("0.932")).toBeInTheDocument();
    expect(within(precision).getByText("150")).toBeInTheDocument();
    expect(within(precision).getByText("Métrica del modelo (log_loss)")).toBeInTheDocument();
    expect(within(precision).getByText("datos sintéticos")).toBeInTheDocument();
  });

  it("shows 'Sin datos' when the precision has no evaluated games", async () => {
    const fetchFn = fakeFetch({
      "GET /api/pronosticos": () => ({ body: lista([]) }),
      "GET /api/pronosticos/precision": () => ({
        body: precisionRes({ n: 0, aciertos: 0, accuracy: null, logLoss: null }),
      }),
    });
    renderApp({ path: "/pronosticos", fetchFn });
    const precision = await screen.findByRole("region", { name: "Precisión del modelo" });
    expect(within(precision).getAllByText("Sin datos")).toHaveLength(2);
  });

  it("shows loading, empty and friendly error states", async () => {
    const pendiente = vi.fn(() => new Promise<Response>(() => {}));
    const { unmount } = renderApp({ path: "/pronosticos", fetchFn: pendiente });
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Cargando");
    unmount();

    const vacio = fakeFetch({
      "GET /api/pronosticos": () => ({ body: lista([]) }),
      "GET /api/pronosticos/precision": () => ({ body: precisionRes() }),
    });
    const { unmount: desmontar } = renderApp({ path: "/pronosticos", fetchFn: vacio });
    expect(
      await screen.findByText("Aún no hay pronósticos para esta selección."),
    ).toBeInTheDocument();
    desmontar();

    const caido = fakeFetch({
      "GET /api/pronosticos": () => ({
        status: 503,
        body: { error: { code: "PREDICCIONES_UNAVAILABLE", message: "x" } },
      }),
      "GET /api/pronosticos/precision": () => ({ body: precisionRes() }),
    });
    renderApp({ path: "/pronosticos", fetchFn: caido });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El servicio de predicciones no está disponible",
    );
  });
});

describe("roles", () => {
  const fetchFn = () =>
    fakeFetch({
      "GET /api/pronosticos": () => ({ body: lista([]) }),
      "GET /api/pronosticos/precision": () => ({ body: precisionRes() }),
      "GET /api/modelos": () => ({ body: lista([]) }),
    });

  it("hides generation and the models tab from USUARIO", async () => {
    renderApp({ path: "/pronosticos", fetchFn: fetchFn() });
    await screen.findByRole("heading", { name: "Pronósticos por partido" });
    expect(screen.queryByRole("button", { name: "Generar pronósticos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Modelos" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Jugadores" })).toBeInTheDocument();
  });

  it("does not open the models panel for USUARIO even if the URL asks for it", async () => {
    renderApp({ path: "/pronosticos?tab=modelos", fetchFn: fetchFn() });
    expect(
      await screen.findByRole("heading", { name: "Pronósticos por partido" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Modelos de predicción" })).not.toBeInTheDocument();
  });

  it("lets ANALISTA generate but not manage models", async () => {
    renderApp({ path: "/pronosticos", fetchFn: fetchFn(), usuario: ANALISTA });
    expect(await screen.findByRole("button", { name: "Generar pronósticos" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Modelos" })).not.toBeInTheDocument();
  });

  it("shows the models tab to ADMIN", async () => {
    renderApp({ path: "/pronosticos", fetchFn: fetchFn(), usuario: ADMIN });
    await userEvent.click(await screen.findByRole("tab", { name: "Modelos" }));
    expect(await screen.findByRole("heading", { name: "Reentrenar" })).toBeInTheDocument();
    expect(screen.getByText("No hay modelos registrados para este deporte.")).toBeInTheDocument();
  });
});

describe("generar pronósticos", () => {
  it("posts the sport and jornada, refetches the list and shows the result", async () => {
    const cuerpos: unknown[] = [];
    let lecturas = 0;
    const fetchFn = fakeFetch({
      "GET /api/pronosticos": () => {
        lecturas++;
        return {
          body: lista(lecturas > 1 ? [pronostico(), pronostico({ id: "pr2" })] : [pronostico()]),
        };
      },
      "GET /api/pronosticos/precision": () => ({ body: precisionRes() }),
      "POST /api/pronosticos/generar": (_url, init) => {
        cuerpos.push(JSON.parse(String(init?.body)));
        return {
          body: { deporte: "BASQUETBOL", modeloId: "m1", generados: 2, pronosticos: [] },
        };
      },
    });
    renderApp({ path: "/pronosticos?jornada=8", fetchFn, usuario: ANALISTA });

    await userEvent.click(await screen.findByRole("button", { name: "Generar pronósticos" }));
    expect(await screen.findByText("Se generaron 2 pronósticos.")).toBeInTheDocument();
    expect(cuerpos).toEqual([{ deporte: "BASQUETBOL", jornada: 8 }]);
    await waitFor(() => expect(lecturas).toBeGreaterThanOrEqual(2));
  });

  it("explains NO_ACTIVE_MODEL in plain Spanish", async () => {
    const fetchFn = fakeFetch({
      "GET /api/pronosticos": () => ({ body: lista([pronostico()]) }),
      "GET /api/pronosticos/precision": () => ({ body: precisionRes() }),
      "POST /api/pronosticos/generar": () => ({
        status: 409,
        body: { error: { code: "NO_ACTIVE_MODEL", message: "sin modelo" } },
      }),
    });
    renderApp({ path: "/pronosticos", fetchFn, usuario: ANALISTA });
    await userEvent.click(await screen.findByRole("button", { name: "Generar pronósticos" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No hay un modelo activo para este deporte.",
    );
  });
});

describe("jugadores tab", () => {
  const proyeccion = (over: Partial<ProyeccionJugador> = {}): ProyeccionJugador => ({
    id: "pj1",
    jugadorId: "j1",
    partidoId: "p1",
    modeloId: "m9",
    metricas: { "pase.yardas": 231.5, "pase.touchdowns": 2 },
    generadoEn: "2026-11-16T10:00:00Z",
    jugador: { id: "j1", nombre: "Patrick Mahomes", posicion: "QB", equipoId: "e1" },
    partido: partido({
      local: { id: "e1", nombre: "Kansas City Chiefs", abreviatura: "KC" },
      visita: { id: "e2", nombre: "Buffalo Bills", abreviatura: "BUF" },
    }),
    modelo: {
      ...modelo("AMERICANO"),
      id: "m9",
      tipo: "PROYECCION_JUGADOR",
      version: "v2.0.0-synthetic",
      nombreMetrica: "mae",
      metricaError: 4.1,
    },
    ...over,
  });

  const precisionProy: PrecisionProyeccion = {
    deporte: "AMERICANO",
    tipo: "PROYECCION_JUGADOR",
    modelo: { id: "m9", version: "v2.0.0-synthetic", nombreMetrica: "mae", metricaError: 4.1 },
    precision: {
      n: 40,
      porObjetivo: {
        "pase.yardas": { n: 40, mae: 18.456 },
        "pase.touchdowns": { n: 40, mae: null },
      },
    },
  };

  it("shows projected metrics with labels, filters by sport and shows MAE per target", async () => {
    const otroDeporte = proyeccion({
      id: "pj2",
      jugador: { id: "j2", nombre: "Jugador Basquet", posicion: "G", equipoId: "e9" },
      modelo: { ...modelo("BASQUETBOL"), tipo: "PROYECCION_JUGADOR" },
    });
    const fetchFn = fakeFetch({
      "GET /api/proyecciones": () => ({ body: lista([proyeccion(), otroDeporte]) }),
      "GET /api/proyecciones/precision": () => ({ body: precisionProy }),
    });
    renderApp({ path: "/pronosticos?tab=jugadores&deporte=AMERICANO", fetchFn });

    const tabla = await screen.findByRole("table", { name: "Proyecciones de jugadores" });
    expect(within(tabla).getByRole("columnheader", { name: "Yds pase" })).toBeInTheDocument();
    expect(within(tabla).getByRole("columnheader", { name: "TD pase" })).toBeInTheDocument();
    expect(within(tabla).getByRole("rowheader", { name: /Patrick Mahomes/ })).toBeInTheDocument();
    expect(within(tabla).getByRole("link", { name: "KC vs BUF" })).toHaveAttribute(
      "href",
      "/partidos/p1",
    );
    expect(within(tabla).getByRole("cell", { name: "2" })).toBeInTheDocument();
    expect(screen.queryByText("Jugador Basquet")).not.toBeInTheDocument();

    const precision = screen.getByRole("region", { name: "Precisión del modelo" });
    const mae = within(precision).getByRole("table", { name: "Error absoluto medio por objetivo" });
    expect(within(mae).getByRole("rowheader", { name: "Yardas por pase" })).toBeInTheDocument();
    expect(within(mae).getByText("18.46")).toBeInTheDocument();
    expect(within(mae).getByText("Sin datos")).toBeInTheDocument();
    expect(within(precision).getByText("datos sintéticos")).toBeInTheDocument();
  });

  it("filters by jornada and generates projections for ANALISTA", async () => {
    const vistas: string[] = [];
    const fetchFn = fakeFetch({
      "GET /api/proyecciones": (url) => {
        vistas.push(url.search);
        return { body: lista([]) };
      },
      "GET /api/proyecciones/precision": () => ({ body: precisionProy }),
      "POST /api/proyecciones/generar": () => ({
        body: { deporte: "AMERICANO", modeloId: "m9", generados: 5, proyecciones: [] },
      }),
    });
    renderApp({
      path: "/pronosticos?tab=jugadores&deporte=AMERICANO&jornada=3",
      fetchFn,
      usuario: ANALISTA,
    });

    expect(
      await screen.findByText("Aún no hay proyecciones para esta selección."),
    ).toBeInTheDocument();
    expect(vistas.at(-1)).toContain("jornada=3");
    await userEvent.click(screen.getByRole("button", { name: "Generar proyecciones" }));
    expect(await screen.findByText("Se generaron 5 proyecciones.")).toBeInTheDocument();
  });

  it("hides generation for USUARIO", async () => {
    const fetchFn = fakeFetch({
      "GET /api/proyecciones": () => ({ body: lista([]) }),
      "GET /api/proyecciones/precision": () => ({ body: precisionProy }),
    });
    renderApp({ path: "/pronosticos?tab=jugadores&deporte=AMERICANO", fetchFn });
    await screen.findByText("Aún no hay proyecciones para esta selección.");
    expect(screen.queryByRole("button", { name: "Generar proyecciones" })).not.toBeInTheDocument();
  });
});

describe("modelos tab (ADMIN)", () => {
  const modelos: ModeloPrediccion[] = [
    {
      ...modelo("BASQUETBOL"),
      id: "m1",
      version: "v1.0.0",
      activo: true,
      artefactoUri: "s3://a",
      entrenadoEn: "2026-11-01T10:00:00Z",
    },
    {
      ...modelo("BASQUETBOL"),
      id: "m2",
      version: "v1.1.0-synthetic",
      activo: false,
      artefactoUri: "s3://b",
      entrenadoEn: "2026-11-10T10:00:00Z",
    },
  ];

  it("activates a model after confirmation", async () => {
    const activados: string[] = [];
    const fetchFn = fakeFetch({
      "GET /api/modelos": () => ({ body: lista(modelos) }),
      "POST /api/modelos/m2/activar": () => {
        activados.push("m2");
        return { body: { modeloId: "m2", activo: true } };
      },
    });
    renderApp({ path: "/pronosticos?tab=modelos", fetchFn, usuario: ADMIN });

    const tabla = await screen.findByRole("table", { name: "Modelos de predicción" });
    expect(within(tabla).getByText("Activo")).toBeInTheDocument();
    expect(within(tabla).getByText("datos sintéticos")).toBeInTheDocument();
    expect(within(tabla).queryByRole("button", { name: "Activar v1.0.0" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Activar v1.1.0-synthetic" }));
    expect(activados).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar activación" }));
    expect(await screen.findByText("Modelo v1.1.0-synthetic activado.")).toBeInTheDocument();
    expect(activados).toEqual(["m2"]);
  });

  it("cancels activation without calling the API", async () => {
    const fetchFn = fakeFetch({
      "GET /api/modelos": () => ({ body: lista(modelos) }),
      "POST /api/modelos/m2/activar": () => ({ body: modelos[1] }),
    });
    renderApp({ path: "/pronosticos?tab=modelos", fetchFn, usuario: ADMIN });
    await userEvent.click(await screen.findByRole("button", { name: "Activar v1.1.0-synthetic" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Activar v1.1.0-synthetic" })).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("reentrena and shows the summary with activado and motivo", async () => {
    const cuerpos: unknown[] = [];
    const fetchFn = fakeFetch({
      "GET /api/modelos": () => ({ body: lista(modelos) }),
      "POST /api/modelos/reentrenar": (_url, init) => {
        cuerpos.push(JSON.parse(String(init?.body)));
        return {
          body: {
            modeloId: "m3",
            version: "v1.2.0",
            deporte: "BASQUETBOL",
            tipo: "RESULTADO_PARTIDO",
            nombreMetrica: "log_loss",
            metrica: 0.91,
            baseline: 0.95,
            nTrain: 800,
            nTest: 200,
            activado: false,
            motivo: "No supera al modelo activo",
          },
        };
      },
    });
    renderApp({ path: "/pronosticos?tab=modelos", fetchFn, usuario: ADMIN });
    await userEvent.click(
      await screen.findByRole("button", { name: "Reentrenar resultado de partido" }),
    );

    const resumen = await screen.findByRole("region", { name: "Resultado del reentrenamiento" });
    expect(within(resumen).getByText("Activado: no")).toBeInTheDocument();
    expect(within(resumen).getByText("Motivo: No supera al modelo activo")).toBeInTheDocument();
    expect(within(resumen).getByText(/Entrenamiento: 800/)).toBeInTheDocument();
    expect(cuerpos).toEqual([{ deporte: "BASQUETBOL", tipo: "RESULTADO_PARTIDO" }]);
  });
});

describe("navigation", () => {
  it("links to the page from the main nav and switches tabs in the URL", async () => {
    const fetchFn = fakeFetch({
      "GET /api/ligas": () => ({ body: { data: [], total: 0, page: 1, pageSize: 100 } }),
      "GET /api/pronosticos": () => ({ body: lista([]) }),
      "GET /api/pronosticos/precision": () => ({ body: precisionRes() }),
      "GET /api/proyecciones": () => ({ body: lista([]) }),
      "GET /api/proyecciones/precision": () => ({
        body: { ...precisionProyeccionVacia(), precision: { n: 0, porObjetivo: {} } },
      }),
    });
    const { location } = renderApp({ path: "/ligas", fetchFn });
    await userEvent.click(await screen.findByRole("link", { name: "Pronósticos" }));
    expect(await screen.findByRole("heading", { name: "Pronósticos" })).toBeInTheDocument();
    expect(location()).toBe("/pronosticos");

    await userEvent.click(screen.getByRole("tab", { name: "Jugadores" }));
    expect(location()).toBe("/pronosticos");
    expect(
      await screen.findByText("Aún no hay proyecciones para esta selección."),
    ).toBeInTheDocument();
  });
});

function precisionProyeccionVacia() {
  return {
    deporte: "BASQUETBOL",
    tipo: "PROYECCION_JUGADOR",
    modelo: { id: "m1", version: "v1.0.0", nombreMetrica: "mae", metricaError: 1 },
  };
}

describe("porcentajesCerrados", () => {
  it("always adds up to 100", () => {
    expect(porcentajesCerrados([0.505, 0.495]).reduce((a, b) => a + b)).toBe(100);
    expect(porcentajesCerrados([1 / 3, 1 / 3, 1 / 3])).toEqual([34, 33, 33]);
    expect(porcentajesCerrados([0, 0])).toEqual([0, 0]);
  });
});
