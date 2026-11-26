import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { ErrorMensaje } from "../../components/ui";

export function LoginPage() {
  const { usuario, login, cognito } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const estado = location.state as { from?: string; aviso?: string } | null;
  const destino = estado?.from ?? "/ligas";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={destino} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await login(email, password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Iniciar sesión</h1>
        {estado?.aviso && <p className="text-sm text-green-700">{estado.aviso}</p>}
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error !== null && <ErrorMensaje error={error} />}
        <button className="btn w-full" type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
        {cognito && (
          <div className="flex justify-between text-sm">
            <Link to="/registro">Crear cuenta</Link>
            <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
          </div>
        )}
      </form>
    </div>
  );
}
