import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProveedorCognito } from "../../auth/cognito";
import { CognitoError } from "../../auth/cognito";
import { fakeFetch, renderApp, USUARIO } from "../../test/render";

const LIGAS_VACIAS = { data: [], total: 0, page: 1, pageSize: 100 };

function fakeCognito(over: Partial<ProveedorCognito> = {}): ProveedorCognito {
  return {
    iniciarSesion: vi.fn(async () => "id-token"),
    idToken: vi.fn(async () => "id-token-2"),
    cerrarSesion: vi.fn(async () => {}),
    registrar: vi.fn(async () => {}),
    confirmarRegistro: vi.fn(async () => {}),
    reenviarCodigo: vi.fn(async () => {}),
    pedirRecuperacion: vi.fn(async () => {}),
    confirmarRecuperacion: vi.fn(async () => {}),
    ...over,
  };
}

const conMe = (extra = {}) =>
  fakeFetch({
    "GET /api/usuarios/me": (_u, init) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === "Bearer id-token" ? { body: USUARIO } : { status: 401 };
    },
    "GET /api/ligas": () => ({ body: LIGAS_VACIAS }),
    ...extra,
  });

describe("login with Cognito", () => {
  it("signs in through Cognito, reads /api/usuarios/me and shows the links", async () => {
    const cognito = fakeCognito();
    const fetchFn = conMe();
    const { location, tokens } = renderApp({ path: "/login", fetchFn, loggedIn: false, cognito });
    expect(await screen.findByRole("link", { name: "Crear cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Correo"), "admin@statline.local");
    await user.type(screen.getByLabelText("Contraseña"), "admin1");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Ligas" })).toBeInTheDocument();
    expect(cognito.iniciarSesion).toHaveBeenCalledWith("admin@statline.local", "admin1");
    expect(location()).toBe("/ligas");
    expect(tokens.get()?.accessToken).toBe("id-token");
  });

  it("shows Cognito's message on bad credentials", async () => {
    const cognito = fakeCognito({
      iniciarSesion: vi.fn(async () => {
        throw new CognitoError("NotAuthorizedException", "Correo o contraseña incorrectos");
      }),
    });
    renderApp({ path: "/login", fetchFn: conMe(), loggedIn: false, cognito });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Correo"), "a@b.co");
    await user.type(screen.getByLabelText("Contraseña"), "malo12");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos");
  });

  it("refreshes the ID token through Cognito on a 401", async () => {
    const cognito = fakeCognito();
    let llamadas = 0;
    const fetchFn = fakeFetch({
      "GET /api/ligas": (_u, init) => {
        llamadas++;
        const auth = (init?.headers as Record<string, string>).Authorization;
        return auth === "Bearer id-token-2" ? { body: LIGAS_VACIAS } : { status: 401 };
      },
    });
    renderApp({ path: "/ligas", fetchFn, cognito });
    expect(await screen.findByRole("heading", { name: "Ligas" })).toBeInTheDocument();
    await waitFor(() => expect(cognito.idToken).toHaveBeenCalledWith(true));
    expect(llamadas).toBeGreaterThanOrEqual(2);
  });

  it("logout also signs out of Cognito", async () => {
    const cognito = fakeCognito();
    renderApp({ path: "/ligas", fetchFn: conMe(), cognito });
    await userEvent.click(await screen.findByRole("button", { name: "Salir" }));
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(cognito.cerrarSesion).toHaveBeenCalled();
  });

  it("local mode has no sign-up or reset links, and those pages send to /login", async () => {
    const { location } = renderApp({ path: "/registro", fetchFn: conMe(), loggedIn: false });
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(location()).toBe("/login");
    expect(screen.queryByRole("link", { name: "Crear cuenta" })).not.toBeInTheDocument();
  });
});

describe("sign-up", () => {
  it("creates the account, confirms the code and signs in", async () => {
    const cognito = fakeCognito();
    const { location } = renderApp({
      path: "/registro",
      fetchFn: conMe(),
      loggedIn: false,
      cognito,
    });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Correo"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "secreto");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(cognito.registrar).toHaveBeenCalledWith("ana@example.com", "secreto", "Ana");

    expect(await screen.findByRole("heading", { name: "Confirma tu correo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reenviar código" }));
    expect(await screen.findByText("Te enviamos un código nuevo.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Código"), " 123456 ");
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("heading", { name: "Ligas" })).toBeInTheDocument();
    expect(cognito.confirmarRegistro).toHaveBeenCalledWith("ana@example.com", "123456");
    expect(location()).toBe("/ligas");
  });

  it("shows the error when the email is taken", async () => {
    const cognito = fakeCognito({
      registrar: vi.fn(async () => {
        throw new CognitoError("UsernameExistsException", "Ya existe una cuenta con ese correo");
      }),
    });
    renderApp({ path: "/registro", fetchFn: conMe(), loggedIn: false, cognito });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Nombre"), "Ana");
    await user.type(screen.getByLabelText("Correo"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "secreto");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya existe una cuenta");
  });
});

describe("password reset", () => {
  it("sends the code, sets the new password and returns to /login with a notice", async () => {
    const cognito = fakeCognito();
    const { location } = renderApp({
      path: "/recuperar",
      fetchFn: conMe(),
      loggedIn: false,
      cognito,
    });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Correo"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Enviar código" }));
    expect(cognito.pedirRecuperacion).toHaveBeenCalledWith("ana@example.com");

    await user.type(await screen.findByLabelText("Código"), "654321");
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva1");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Contraseña cambiada. Inicia sesión.")).toBeInTheDocument();
    expect(cognito.confirmarRecuperacion).toHaveBeenCalledWith(
      "ana@example.com",
      "654321",
      "nueva1",
    );
    expect(location()).toBe("/login");
  });

  it("shows the error on a wrong code", async () => {
    const cognito = fakeCognito({
      confirmarRecuperacion: vi.fn(async () => {
        throw new CognitoError("CodeMismatchException", "El código no es correcto");
      }),
    });
    renderApp({ path: "/recuperar", fetchFn: conMe(), loggedIn: false, cognito });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Correo"), "a@b.co");
    await user.click(screen.getByRole("button", { name: "Enviar código" }));
    await user.type(await screen.findByLabelText("Código"), "1");
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva1");
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El código no es correcto");
  });
});
