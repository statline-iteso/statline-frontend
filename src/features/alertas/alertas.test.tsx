import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Alerta, EquipoRef, Jugador } from "../../api/types";
import { fakeFetch, renderApp } from "../../test/render";

const pag = <T,>(data: T[]) => ({ data, total: data.length, page: 1, pageSize: 20 });

const JUGADOR: Jugador = {
  id: "j1",
  nombre: "LeBron James",
  deporte: "BASQUETBOL",
  posicion: "F",
  numero: 23,
  estatus: "DISPONIBLE",
  equipo: null,
};
const EQUIPO: EquipoRef = { id: "e1", nombre: "Lakers", abreviatura: "LAL" };

const alerta = (extra: Partial<Alerta>): Alerta => ({
  id: "a1",
  usuarioId: "u1",
  tipo: "LESION",
  jugadorId: "j1",
  equipoId: null,
  condicion: null,
  activa: true,
  ultimaDisparada: null,
  creadoEn: "2026-11-01T12:00:00Z",
  ...extra,
});

/** Fake backend for the alerts screen: keeps the list in memory and records writes. */
function backend(iniciales: Alerta[] = []) {
  const alertas = [...iniciales];
  const escrituras: Array<{ metodo: string; body: unknown }> = [];
  const leer = (init?: RequestInit) => JSON.parse(String(init?.body ?? "{}")) as unknown;
  return {
    alertas,
    escrituras,
    handlers: {
      "GET /api/alertas": () => ({ body: pag(alertas) }),
      "POST /api/alertas": (_u: URL, init?: RequestInit) => {
        const body = leer(init);
        escrituras.push({ metodo: "POST", body });
        alertas.push(alerta({ id: `n${alertas.length}`, ...(body as object) } as Partial<Alerta>));
        return { status: 201, body: alertas[alertas.length - 1] };
      },
      "PUT /api/alertas/a1": (_u: URL, init?: RequestInit) => {
        const body = leer(init) as { activa: boolean };
        escrituras.push({ metodo: "PUT", body });
        alertas[0] = { ...alertas[0]!, activa: body.activa };
        return { body: alertas[0] };
      },
      "DELETE /api/alertas/a1": () => {
        escrituras.push({ metodo: "DELETE", body: undefined });
        alertas.splice(0, 1);
        return { status: 204 };
      },
      "GET /api/jugadores": () => ({ body: pag([JUGADOR]) }),
      "GET /api/jugadores/j1": () => ({ body: JUGADOR }),
      "GET /api/equipos": () => ({ body: pag([EQUIPO]) }),
      "GET /api/equipos/e1": () => ({ body: EQUIPO }),
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("alertas: formulario por tipo", () => {
  it("is reachable from the navigation", async () => {
    renderApp({
      path: "/listas",
      fetchFn: fakeFetch({ "GET /api/listas": () => ({ body: pag([]) }) }),
    });
    expect(await screen.findByRole("link", { name: "Alertas" })).toHaveAttribute(
      "href",
      "/alertas",
    );
    expect(screen.getByRole("link", { name: "Listas" })).toHaveAttribute("href", "/listas");
  });

  it("LESION requires a jugador and sends only jugadorId", async () => {
    const api = backend();
    const fetchFn = fakeFetch(api.handlers);
    renderApp({ path: "/alertas", fetchFn });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Crear alerta" }));
    expect(screen.getByText("Elige un jugador.")).toBeInTheDocument();
    expect(api.escrituras).toHaveLength(0);

    await user.type(screen.getByLabelText("Buscar jugador"), "LeBron");
    await user.click(await screen.findByRole("button", { name: "Elegir LeBron James" }));
    expect(screen.getByText("Jugador:", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("Métrica")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Crear alerta" }));
    expect(await screen.findByText("Alerta creada.")).toBeInTheDocument();
    expect(api.escrituras).toEqual([{ metodo: "POST", body: { tipo: "LESION", jugadorId: "j1" } }]);
  });

  it("UMBRAL asks for a metric of the jugador's sport, an operator and a number", async () => {
    const api = backend();
    renderApp({ path: "/alertas", fetchFn: fakeFetch(api.handlers) });
    const user = userEvent.setup();

    await user.selectOptions(await screen.findByLabelText("Tipo de alerta"), "UMBRAL");
    const metrica = screen.getByLabelText("Métrica");
    expect(metrica).toBeDisabled();

    await user.type(screen.getByLabelText("Buscar jugador"), "LeBron");
    await user.click(await screen.findByRole("button", { name: "Elegir LeBron James" }));
    expect(screen.getByLabelText("Métrica")).toBeEnabled();
    expect(
      within(screen.getByLabelText("Métrica")).getByRole("option", { name: "Puntos" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Métrica")).queryByRole("option", { name: "Goles" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Crear alerta" }));
    expect(screen.getByText("Elige una métrica.")).toBeInTheDocument();
    expect(screen.getByText("Indica un número.")).toBeInTheDocument();
    expect(api.escrituras).toHaveLength(0);

    await user.selectOptions(screen.getByLabelText("Métrica"), "puntos");
    await user.selectOptions(screen.getByLabelText("Operador"), ">");
    await user.type(screen.getByLabelText("Valor"), "27.5");
    await user.click(screen.getByRole("button", { name: "Crear alerta" }));

    expect(await screen.findByText("Alerta creada.")).toBeInTheDocument();
    expect(api.escrituras).toEqual([
      {
        metodo: "POST",
        body: {
          tipo: "UMBRAL",
          jugadorId: "j1",
          condicion: { metrica: "puntos", operador: ">", valor: 27.5 },
        },
      },
    ]);
  });

  it("INICIO_PARTIDO aimed at a team requires the team", async () => {
    const api = backend();
    renderApp({ path: "/alertas", fetchFn: fakeFetch(api.handlers) });
    const user = userEvent.setup();

    await user.selectOptions(await screen.findByLabelText("Tipo de alerta"), "INICIO_PARTIDO");
    await user.selectOptions(screen.getByLabelText("Aplica a"), "EQUIPO");
    await user.click(screen.getByRole("button", { name: "Crear alerta" }));
    expect(screen.getByText("Elige un equipo.")).toBeInTheDocument();

    await user.selectOptions(await screen.findByLabelText("Equipo"), "e1");
    await user.click(screen.getByRole("button", { name: "Crear alerta" }));
    expect(await screen.findByText("Alerta creada.")).toBeInTheDocument();
    expect(api.escrituras).toEqual([
      { metodo: "POST", body: { tipo: "INICIO_PARTIDO", equipoId: "e1" } },
    ]);
  });

  it("shows field errors and the message from a server 400", async () => {
    const fetchFn = fakeFetch({
      "GET /api/alertas": () => ({ body: pag([]) }),
      "GET /api/jugadores": () => ({ body: pag([JUGADOR]) }),
      "POST /api/alertas": () => ({
        status: 400,
        body: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Solicitud inválida",
            details: [{ path: ["jugadorId"], message: "El jugador no existe" }],
          },
        },
      }),
    });
    renderApp({ path: "/alertas", fetchFn });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Buscar jugador"), "LeBron");
    await user.click(await screen.findByRole("button", { name: "Elegir LeBron James" }));
    await user.click(screen.getByRole("button", { name: "Crear alerta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Solicitud inválida");
    expect(screen.getByText("El jugador no existe")).toBeInTheDocument();
  });
});

describe("alertas: lista", () => {
  it("toggles activa with a PUT and shows the new state", async () => {
    const api = backend([alerta({ tipo: "LESION" })]);
    renderApp({ path: "/alertas", fetchFn: fakeFetch(api.handlers) });
    const user = userEvent.setup();

    const interruptor = await screen.findByRole("switch", { name: "Activa" });
    expect(interruptor).toHaveAttribute("aria-checked", "true");
    await user.click(interruptor);

    expect(await screen.findByRole("switch", { name: "Pausada" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(api.escrituras).toEqual([{ metodo: "PUT", body: { activa: false } }]);
  });

  it("deletes after confirmation and shows the empty state", async () => {
    const api = backend([alerta({ tipo: "LESION" })]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderApp({ path: "/alertas", fetchFn: fakeFetch(api.handlers) });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Eliminar" }));
    expect(await screen.findByText("Aún no tienes alertas.")).toBeInTheDocument();
    expect(api.escrituras).toEqual([{ metodo: "DELETE", body: undefined }]);
  });

  it("describes each alert with its target, condition and last trigger", async () => {
    const api = backend([
      alerta({
        id: "a1",
        tipo: "UMBRAL",
        condicion: { metrica: "puntos", operador: ">=", valor: 30 },
        ultimaDisparada: "2026-11-10T20:00:00Z",
      }),
    ]);
    renderApp({ path: "/alertas", fetchFn: fakeFetch(api.handlers) });

    expect(await screen.findByText("Umbral de métrica")).toBeInTheDocument();
    expect(await screen.findByText("LeBron James")).toBeInTheDocument();
    expect(screen.getByText("Puntos >= 30")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Última vez disparada/)).toBeInTheDocument());
  });

  it("shows the API error when the list cannot be loaded", async () => {
    const fetchFn = fakeFetch({
      "GET /api/alertas": () => ({
        status: 500,
        body: { error: { code: "X", message: "Sin servicio" } },
      }),
      "GET /api/jugadores": () => ({ body: pag([]) }),
    });
    renderApp({ path: "/alertas", fetchFn });
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin servicio");
  });
});
