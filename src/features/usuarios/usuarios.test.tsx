import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeFetch, renderApp, USUARIO } from "../../test/render";

const ADMIN = {
  id: "a1",
  email: "admin@statline.local",
  nombre: "Administrador",
  rol: "ADMIN" as const,
};
const fila = (u: typeof USUARIO | typeof ADMIN) => ({
  ...u,
  creadoEn: "2026-11-25T10:00:00Z",
  actualizadoEn: "2026-11-25T10:00:00Z",
});
const pagina = (data: unknown[]) => ({ data, total: data.length, page: 1, pageSize: 20 });

afterEach(() => vi.restoreAllMocks());

describe("Usuarios (ADMIN)", () => {
  it("shows the nav link only to ADMIN and lists the users", async () => {
    const fetchFn = fakeFetch({
      "GET /api/usuarios": () => ({ body: pagina([fila(ADMIN), fila(USUARIO)]) }),
    });
    renderApp({ path: "/usuarios", fetchFn, usuario: ADMIN });
    expect(await screen.findByRole("heading", { name: "Usuarios" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usuarios" })).toBeInTheDocument();
    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    // Own row: role locked, no delete.
    expect(screen.getByLabelText("Rol de admin@statline.local")).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Eliminar" })).toHaveLength(1);
  });

  it("changes a user's role", async () => {
    let cuerpo: unknown;
    const fetchFn = fakeFetch({
      "GET /api/usuarios": () => ({ body: pagina([fila(ADMIN), fila(USUARIO)]) }),
      "PUT /api/usuarios/u1": (_u, init) => {
        cuerpo = JSON.parse(String(init?.body));
        return { body: { ...fila(USUARIO), rol: "ANALISTA" } };
      },
    });
    renderApp({ path: "/usuarios", fetchFn, usuario: ADMIN });
    await userEvent.selectOptions(
      await screen.findByLabelText("Rol de ana@example.com"),
      "ANALISTA",
    );
    await waitFor(() => expect(cuerpo).toEqual({ rol: "ANALISTA" }));
  });

  it("deletes a user after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchFn = fakeFetch({
      "GET /api/usuarios": () => ({ body: pagina([fila(ADMIN), fila(USUARIO)]) }),
      "DELETE /api/usuarios/u1": () => ({ status: 204 }),
    });
    renderApp({ path: "/usuarios", fetchFn, usuario: ADMIN });
    const fila_ = (await screen.findByText("ana@example.com")).closest("tr")!;
    await userEvent.click(within(fila_).getByRole("button", { name: "Eliminar" }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("ana@example.com"));
    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining("/api/usuarios/u1"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("shows the API error when a change fails", async () => {
    const fetchFn = fakeFetch({
      "GET /api/usuarios": () => ({ body: pagina([fila(ADMIN), fila(USUARIO)]) }),
      "PUT /api/usuarios/u1": () => ({
        status: 403,
        body: { error: { code: "FORBIDDEN", message: "Permisos insuficientes" } },
      }),
    });
    renderApp({ path: "/usuarios", fetchFn, usuario: ADMIN });
    await userEvent.selectOptions(await screen.findByLabelText("Rol de ana@example.com"), "ADMIN");
    expect(await screen.findByRole("alert")).toHaveTextContent("Permisos insuficientes");
  });

  it("a non-admin gets no link, a notice, and no request", async () => {
    const fetchFn = fakeFetch({});
    renderApp({ path: "/usuarios", fetchFn });
    expect(await screen.findByRole("alert")).toHaveTextContent("Solo un administrador");
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/usuarios"),
      expect.anything(),
    );
  });
});
