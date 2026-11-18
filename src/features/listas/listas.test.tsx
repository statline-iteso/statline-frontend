import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ElementoLista, EquipoRef, Jugador, ListaSeguimiento } from "../../api/types";
import { fakeFetch, renderApp } from "../../test/render";

const pag = <T,>(data: T[]) => ({ data, total: data.length, page: 1, pageSize: 20 });

const JUGADOR: Jugador = {
  id: "j1",
  nombre: "LeBron James",
  deporte: "BASQUETBOL",
  posicion: "F",
  numero: 23,
  estatus: "DISPONIBLE",
  equipo: { id: "e1", nombre: "Lakers", abreviatura: "LAL" },
};
const EQUIPO: EquipoRef = { id: "e1", nombre: "Lakers", abreviatura: "LAL" };

/** In-memory backend for one list: lists and elementos change as the requests come in. */
function backend(
  listaInicial: Omit<ListaSeguimiento, "elementos">,
  elementos: ElementoLista[] = [],
) {
  const listas: ListaSeguimiento[] = [{ ...listaInicial, elementos: undefined }];
  const lista = { ...listaInicial, elementos };
  const body = (init?: RequestInit) =>
    JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
  return {
    listas,
    handlers: {
      "GET /api/listas": () => ({ body: pag(listas) }),
      "POST /api/listas": (_u: URL, init?: RequestInit) => {
        const nueva = {
          id: "l2",
          usuarioId: "u1",
          nombre: body(init).nombre as string,
          creadoEn: "2026-11-01T12:00:00Z",
        };
        listas.push(nueva);
        return { status: 201, body: nueva };
      },
      "GET /api/listas/l2": () => ({ body: { ...listas[listas.length - 1], elementos: [] } }),
      "GET /api/listas/l1": () => ({ body: lista }),
      "PUT /api/listas/l1": (_u: URL, init?: RequestInit) => {
        lista.nombre = body(init).nombre as string;
        return { body: lista };
      },
      "DELETE /api/listas/l1": () => ({ status: 204 }),
      "POST /api/listas/l1/elementos": (_u: URL, init?: RequestInit) => {
        const { tipo, refId } = body(init) as { tipo: ElementoLista["tipo"]; refId: string };
        if (lista.elementos.some((e) => e.refId === refId)) {
          return { status: 409, body: { error: { code: "CONFLICT", message: "Duplicado" } } };
        }
        const nuevo: ElementoLista = { id: `x${refId}`, listaId: "l1", tipo, refId };
        lista.elementos.push(nuevo);
        return { status: 201, body: nuevo };
      },
      "DELETE /api/listas/l1/elementos/j1": () => {
        lista.elementos = lista.elementos.filter((e) => e.refId !== "j1");
        return { status: 204 };
      },
      "GET /api/jugadores": () => ({ body: pag([JUGADOR]) }),
      "GET /api/jugadores/j1": () => ({ body: JUGADOR }),
      "GET /api/equipos": () => ({ body: pag([EQUIPO]) }),
      "GET /api/equipos/e1": () => ({ body: EQUIPO }),
    },
  };
}

const LISTA = {
  id: "l1",
  usuarioId: "u1",
  nombre: "Ruta fantasy",
  creadoEn: "2026-11-01T12:00:00Z",
};

afterEach(() => vi.restoreAllMocks());

describe("listas: index", () => {
  it("shows the empty state, then creates a list and opens it", async () => {
    const api = backend(LISTA);
    api.listas.length = 0;
    const fetchFn = fakeFetch(api.handlers);
    const { location } = renderApp({ path: "/listas", fetchFn });

    expect(await screen.findByText("Aún no tienes listas de seguimiento.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Listas" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Crear lista" }));
    expect(screen.getByText("Escribe un nombre para la lista.")).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, i]) => i?.method === "POST")).toBe(false);

    await user.type(screen.getByLabelText("Nombre de la lista"), "  Semana 1  ");
    await user.click(screen.getByRole("button", { name: "Crear lista" }));

    expect(await screen.findByLabelText("Nombre")).toHaveValue("Semana 1");
    expect(location()).toBe("/listas/l2");
    const post = fetchFn.mock.calls.find(([, i]) => i?.method === "POST")!;
    expect(post[1]!.body).toBe('{"nombre":"Semana 1"}');
  });

  it("lists the owner's lists and shows errors", async () => {
    const api = backend(LISTA);
    renderApp({ path: "/listas", fetchFn: fakeFetch(api.handlers) });
    const enlace = (await screen.findByText("Ruta fantasy")).closest("a");
    expect(enlace).toHaveAttribute("href", "/listas/l1");
  });

  it("shows the API error when the list cannot be loaded", async () => {
    const fetchFn = fakeFetch({
      "GET /api/listas": () => ({ status: 500, body: { error: { code: "X", message: "Caída" } } }),
    });
    renderApp({ path: "/listas", fetchFn });
    expect(await screen.findByRole("alert")).toHaveTextContent("Caída");
  });
});

describe("listas: detail", () => {
  it("renames the list and shows confirmation", async () => {
    const api = backend(LISTA);
    const fetchFn = fakeFetch(api.handlers);
    renderApp({ path: "/listas/l1", fetchFn });
    const user = userEvent.setup();

    const nombre = await screen.findByLabelText("Nombre");
    await user.clear(nombre);
    await user.click(screen.getByRole("button", { name: "Guardar nombre" }));
    expect(screen.getByText("El nombre no puede estar vacío.")).toBeInTheDocument();

    await user.type(nombre, "Ruta trade");
    await user.click(screen.getByRole("button", { name: "Guardar nombre" }));
    expect(await screen.findByText("Nombre guardado.")).toBeInTheDocument();
    const put = fetchFn.mock.calls.find(([, i]) => i?.method === "PUT")!;
    expect(put[1]!.body).toBe('{"nombre":"Ruta trade"}');
  });

  it("adds a jugador found by search and shows the 409 duplicate message", async () => {
    const api = backend(LISTA);
    renderApp({ path: "/listas/l1", fetchFn: fakeFetch(api.handlers) });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Buscar jugador"), "LeBron");
    await user.click(await screen.findByRole("button", { name: "Agregar LeBron James" }));

    const elemento = await screen.findByText("Jugador");
    expect(within(elemento.closest("li")!).getByText("LeBron James")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agregar LeBron James" }));
    expect(await screen.findByText("Ya está en la lista.")).toBeInTheDocument();
  });

  it("adds a team and removes an element after confirmation", async () => {
    const api = backend(LISTA, [{ id: "xj1", listaId: "l1", tipo: "JUGADOR", refId: "j1" }]);
    const fetchFn = fakeFetch(api.handlers);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderApp({ path: "/listas/l1", fetchFn });
    const user = userEvent.setup();

    expect(await screen.findByText("Jugador")).toBeInTheDocument();
    const equipo = await screen.findByLabelText("Equipo");
    expect(within(equipo).getByRole("option", { name: "Lakers" })).toBeInTheDocument();
    await user.selectOptions(equipo, "e1");
    await user.click(screen.getByRole("button", { name: "Agregar equipo" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Quitar" })).toHaveLength(2));
    const filaEquipo = screen
      .getAllByRole("listitem")
      .find((li) => li.textContent?.includes("Equipo"));
    expect(within(filaEquipo!).getByText("Lakers")).toBeInTheDocument();

    const quitar = screen.getAllByRole("button", { name: "Quitar" });
    await user.click(quitar[0]!);
    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(
        fetchFn.mock.calls.some(
          ([u, i]) => i?.method === "DELETE" && String(u).endsWith("/elementos/j1"),
        ),
      ).toBe(true),
    );
  });

  it("deletes the list after confirmation and returns to the index", async () => {
    const api = backend(LISTA);
    const fetchFn = fakeFetch(api.handlers);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { location } = renderApp({ path: "/listas/l1", fetchFn });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Eliminar lista" }));
    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(location()).toBe("/listas"));
    expect(fetchFn.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(true);
  });

  it("does not delete when the confirmation is declined", async () => {
    const api = backend(LISTA);
    const fetchFn = fakeFetch(api.handlers);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderApp({ path: "/listas/l1", fetchFn });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Eliminar lista" }));
    expect(fetchFn.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false);
  });

  it("shows loading and error states", async () => {
    const fetchFn = fakeFetch({
      "GET /api/listas/l1": () => ({
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "Lista no encontrada" } },
      }),
    });
    renderApp({ path: "/listas/l1", fetchFn });
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(await screen.findByRole("alert")).toHaveTextContent("Lista no encontrada");
  });
});
