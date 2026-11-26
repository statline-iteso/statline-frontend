import { Amplify } from "aws-amplify";
import {
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "aws-amplify/auth";

/**
 * Amazon Cognito sign-in (statline-infra D-47). Cognito keeps the passwords; the api checks the
 * Cognito ID token and keeps the roles (backend D-41). The pool comes from /config.js at runtime,
 * so one image serves both environments; without it the SPA uses the api's own login. main.tsx
 * imports this module (and Amplify) only when the pool is configured.
 */
export interface ProveedorCognito {
  /** Signs in and returns the ID token the api expects. */
  iniciarSesion(email: string, password: string): Promise<string>;
  /** Current ID token; `forzar` refreshes it with the refresh token Amplify keeps. */
  idToken(forzar: boolean): Promise<string | null>;
  cerrarSesion(): Promise<void>;
  registrar(email: string, password: string, nombre: string): Promise<void>;
  confirmarRegistro(email: string, codigo: string): Promise<void>;
  reenviarCodigo(email: string): Promise<void>;
  pedirRecuperacion(email: string): Promise<void>;
  confirmarRecuperacion(email: string, codigo: string, nueva: string): Promise<void>;
}

const MENSAJES: Record<string, string> = {
  NotAuthorizedException: "Correo o contraseña incorrectos",
  UserNotFoundException: "Correo o contraseña incorrectos",
  UserNotConfirmedException: "Confirma tu correo con el código que te enviamos",
  UsernameExistsException: "Ya existe una cuenta con ese correo",
  InvalidPasswordException: "La contraseña debe tener al menos 6 caracteres",
  CodeMismatchException: "El código no es correcto",
  ExpiredCodeException: "El código expiró; pide uno nuevo",
  LimitExceededException: "Demasiados intentos; espera unos minutos",
  TooManyRequestsException: "Demasiados intentos; espera unos minutos",
  InvalidParameterException: "Revisa los datos del formulario",
};

/** Cognito errors as Spanish messages the pages show with ErrorMensaje. */
export class CognitoError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function traducir(err: unknown): CognitoError {
  const name = err instanceof Error ? err.name : "";
  return new CognitoError(name || "Error", MENSAJES[name] ?? "No se pudo completar la operación");
}

const conTraduccion =
  <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
  async (...a: A): Promise<R> => {
    try {
      return await fn(...a);
    } catch (err) {
      throw err instanceof CognitoError ? err : traducir(err);
    }
  };

export function crearProveedorCognito(cfg: {
  userPoolId: string;
  clientId: string;
}): ProveedorCognito {
  Amplify.configure({
    Auth: { Cognito: { userPoolId: cfg.userPoolId, userPoolClientId: cfg.clientId } },
  });

  const idToken = async (forzar: boolean) => {
    try {
      const s = await fetchAuthSession({ forceRefresh: forzar });
      return s.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  };

  return {
    iniciarSesion: conTraduccion(async (email: string, password: string) => {
      const entrar = () => signIn({ username: email, password });
      let r;
      try {
        r = await entrar();
      } catch (err) {
        // A previous session still in Amplify's storage: drop it and sign in again.
        if (err instanceof Error && err.name === "UserAlreadyAuthenticatedException") {
          await signOut();
          r = await entrar();
        } else throw err;
      }
      if (r.nextStep.signInStep === "CONFIRM_SIGN_UP") {
        throw new CognitoError("UserNotConfirmedException", MENSAJES.UserNotConfirmedException!);
      }
      if (!r.isSignedIn) throw new CognitoError("NextStep", "No se pudo iniciar sesión");
      const t = await idToken(false);
      if (!t) throw new CognitoError("NoToken", "No se pudo iniciar sesión");
      return t;
    }),
    idToken,
    cerrarSesion: async () => {
      try {
        await signOut();
      } catch {
        /* the local session is cleared anyway */
      }
    },
    registrar: conTraduccion(async (email: string, password: string, nombre: string) => {
      await signUp({
        username: email,
        password,
        options: { userAttributes: { email, name: nombre } },
      });
    }),
    confirmarRegistro: conTraduccion(async (email: string, codigo: string) => {
      await confirmSignUp({ username: email, confirmationCode: codigo });
    }),
    reenviarCodigo: conTraduccion(async (email: string) => {
      await resendSignUpCode({ username: email });
    }),
    pedirRecuperacion: conTraduccion(async (email: string) => {
      await resetPassword({ username: email });
    }),
    confirmarRecuperacion: conTraduccion(async (email: string, codigo: string, nueva: string) => {
      await confirmResetPassword({ username: email, confirmationCode: codigo, newPassword: nueva });
    }),
  };
}
