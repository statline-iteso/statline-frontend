import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { ErrorMensaje } from "../../components/ui";

/** Password reset through Cognito (statline-infra D-47): email, then code and new password. */
export function RecuperarPage() {
  const { cognito } = useAuth();
  const navigate = useNavigate();
  const [paso, setPaso] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  if (!cognito) return <Navigate to="/login" replace />;

  const enviar = (accion: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await accion();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  const onEmail = enviar(async () => {
    await cognito.pedirRecuperacion(email);
    setPaso("codigo");
  });
  const onCodigo = enviar(async () => {
    await cognito.confirmarRecuperacion(email, codigo, nueva);
    navigate("/login", { replace: true, state: { aviso: "Contraseña cambiada. Inicia sesión." } });
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {paso === "email" ? (
        <form onSubmit={onEmail} className="card w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">Recuperar contraseña</h1>
          <label className="block text-sm">
            Correo
            <input
              className="input mt-1"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error !== null && <ErrorMensaje error={error} />}
          <button className="btn w-full" type="submit" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar código"}
          </button>
          <p className="text-center text-sm">
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={onCodigo} className="card w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">Nueva contraseña</h1>
          <p className="text-sm text-slate-500">Si {email} tiene cuenta, le enviamos un código.</p>
          <label className="block text-sm">
            Código
            <input
              className="input mt-1"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.trim())}
            />
          </label>
          <label className="block text-sm">
            Contraseña nueva
            <input
              className="input mt-1"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
          </label>
          {error !== null && <ErrorMensaje error={error} />}
          <button className="btn w-full" type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}
