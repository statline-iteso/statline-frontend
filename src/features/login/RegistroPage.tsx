import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { ErrorMensaje } from "../../components/ui";

/** Self sign-up through Cognito (statline-infra D-47): account, then the emailed code. */
export function RegistroPage() {
  const { usuario, cognito, login } = useAuth();
  const navigate = useNavigate();
  const [paso, setPaso] = useState<"datos" | "codigo">("datos");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/ligas" replace />;
  if (!cognito) return <Navigate to="/login" replace />;

  const enviar = (accion: () => Promise<void>) => async (e?: FormEvent) => {
    e?.preventDefault();
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      await accion();
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  const onDatos = enviar(async () => {
    await cognito.registrar(email, password, nombre);
    setPaso("codigo");
  });
  const onCodigo = enviar(async () => {
    await cognito.confirmarRegistro(email, codigo);
    await login(email, password);
    navigate("/ligas", { replace: true });
  });
  const onReenviar = enviar(async () => {
    await cognito.reenviarCodigo(email);
    setAviso("Te enviamos un código nuevo.");
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {paso === "datos" ? (
        <form onSubmit={onDatos} className="card w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">Crear cuenta</h1>
          <label className="block text-sm">
            Nombre
            <input
              className="input mt-1"
              autoComplete="name"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
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
          <label className="block text-sm">
            Contraseña
            <input
              className="input mt-1"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error !== null && <ErrorMensaje error={error} />}
          <button className="btn w-full" type="submit" disabled={enviando}>
            {enviando ? "Creando…" : "Crear cuenta"}
          </button>
          <p className="text-center text-sm">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={onCodigo} className="card w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">Confirma tu correo</h1>
          <p className="text-sm text-slate-500">Escribe el código que enviamos a {email}.</p>
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
          {aviso && <p className="text-sm text-green-700">{aviso}</p>}
          {error !== null && <ErrorMensaje error={error} />}
          <button className="btn w-full" type="submit" disabled={enviando}>
            {enviando ? "Confirmando…" : "Confirmar"}
          </button>
          <button
            className="w-full text-sm underline"
            type="button"
            disabled={enviando}
            onClick={() => void onReenviar()}
          >
            Reenviar código
          </button>
        </form>
      )}
    </div>
  );
}
