import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const ENLACES = [
  { to: "/ligas", texto: "Ligas" },
  { to: "/partidos", texto: "Partidos" },
  { to: "/jugadores", texto: "Jugadores" },
  { to: "/pronosticos", texto: "Pronósticos" },
  // TODO(SL-45, SL-47): Comparar, Listas y Alertas.
];

export function Layout() {
  const { usuario, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="text-lg font-bold tracking-tight">StatLine</span>
          <nav className="flex flex-1 gap-1">
            {ENLACES.map((e) => (
              <NavLink
                key={e.to}
                to={e.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm ${
                    isActive
                      ? "bg-sky-100 font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-100"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`
                }
              >
                {e.texto}
              </NavLink>
            ))}
          </nav>
          <span className="text-sm text-slate-500">{usuario?.nombre}</span>
          <button className="text-sm text-slate-600 underline dark:text-slate-300" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
