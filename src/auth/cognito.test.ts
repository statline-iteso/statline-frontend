import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  confirmSignUp: vi.fn(),
  resendSignUpCode: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  fetchAuthSession: vi.fn(),
}));
const configure = vi.hoisted(() => vi.fn());
vi.mock("aws-amplify/auth", () => auth);
vi.mock("aws-amplify", () => ({ Amplify: { configure } }));

import { CognitoError, crearProveedorCognito, traducir } from "./cognito";
import { configCognito } from "./config-cognito";

const cfg = { userPoolId: "us-east-1_abc", clientId: "cli" };
const sesion = (t: string | null) => ({
  tokens: t ? { idToken: { toString: () => t } } : undefined,
});
const nombrado = (name: string) => Object.assign(new Error(name), { name });

beforeEach(() => vi.clearAllMocks());

describe("configCognito", () => {
  it("needs both ids", () => {
    expect(configCognito({})).toBeNull();
    expect(configCognito({ cognitoUserPoolId: "p" })).toBeNull();
    expect(configCognito({ cognitoUserPoolId: "p", cognitoClientId: "c" })).toEqual({
      userPoolId: "p",
      clientId: "c",
    });
  });
});

describe("crearProveedorCognito", () => {
  it("configures Amplify with the pool", () => {
    crearProveedorCognito(cfg);
    expect(configure).toHaveBeenCalledWith({
      Auth: { Cognito: { userPoolId: "us-east-1_abc", userPoolClientId: "cli" } },
    });
  });

  it("signs in and returns the ID token", async () => {
    auth.signIn.mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: "DONE" } });
    auth.fetchAuthSession.mockResolvedValue(sesion("id-token"));
    await expect(crearProveedorCognito(cfg).iniciarSesion("a@b.co", "admin1")).resolves.toBe(
      "id-token",
    );
    expect(auth.signIn).toHaveBeenCalledWith({ username: "a@b.co", password: "admin1" });
  });

  it("drops a stale session and signs in again", async () => {
    auth.signIn
      .mockRejectedValueOnce(nombrado("UserAlreadyAuthenticatedException"))
      .mockResolvedValueOnce({ isSignedIn: true, nextStep: { signInStep: "DONE" } });
    auth.fetchAuthSession.mockResolvedValue(sesion("t2"));
    await expect(crearProveedorCognito(cfg).iniciarSesion("a@b.co", "x")).resolves.toBe("t2");
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("asks for the code when the account is not confirmed", async () => {
    auth.signIn.mockResolvedValue({
      isSignedIn: false,
      nextStep: { signInStep: "CONFIRM_SIGN_UP" },
    });
    await expect(crearProveedorCognito(cfg).iniciarSesion("a@b.co", "x")).rejects.toMatchObject({
      code: "UserNotConfirmedException",
    });
  });

  it("translates Cognito errors to Spanish", async () => {
    auth.signIn.mockRejectedValue(nombrado("NotAuthorizedException"));
    await expect(crearProveedorCognito(cfg).iniciarSesion("a@b.co", "x")).rejects.toThrow(
      "Correo o contraseña incorrectos",
    );
    expect(traducir(new Error("x")).message).toBe("No se pudo completar la operación");
    expect(traducir("raro")).toBeInstanceOf(CognitoError);
  });

  it("refreshes the token and returns null without a session", async () => {
    const p = crearProveedorCognito(cfg);
    auth.fetchAuthSession.mockResolvedValueOnce(sesion("nuevo"));
    await expect(p.idToken(true)).resolves.toBe("nuevo");
    expect(auth.fetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
    auth.fetchAuthSession.mockRejectedValueOnce(new Error("no"));
    await expect(p.idToken(true)).resolves.toBeNull();
  });

  it("passes sign-up, confirmation and reset through", async () => {
    const p = crearProveedorCognito(cfg);
    await p.registrar("a@b.co", "secreto", "Ana");
    expect(auth.signUp).toHaveBeenCalledWith({
      username: "a@b.co",
      password: "secreto",
      options: { userAttributes: { email: "a@b.co", name: "Ana" } },
    });
    await p.confirmarRegistro("a@b.co", "123456");
    expect(auth.confirmSignUp).toHaveBeenCalledWith({
      username: "a@b.co",
      confirmationCode: "123456",
    });
    await p.reenviarCodigo("a@b.co");
    expect(auth.resendSignUpCode).toHaveBeenCalledWith({ username: "a@b.co" });
    await p.pedirRecuperacion("a@b.co");
    expect(auth.resetPassword).toHaveBeenCalledWith({ username: "a@b.co" });
    await p.confirmarRecuperacion("a@b.co", "1", "nueva1");
    expect(auth.confirmResetPassword).toHaveBeenCalledWith({
      username: "a@b.co",
      confirmationCode: "1",
      newPassword: "nueva1",
    });
    auth.signOut.mockRejectedValueOnce(new Error("x"));
    await expect(p.cerrarSesion()).resolves.toBeUndefined();
  });
});
