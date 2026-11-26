import { useSearchParams } from "react-router-dom";
import { useCambiarRol, useEliminarUsuario, useUsuarios } from "../../api/queries";
import type { Rol, UsuarioAdmin } from "../../api/types";
import { useAuth } from "../../auth/useAuth";
import { esAdmin } from "../../auth/roles";
import { Cargando, ErrorMensaje, Paginacion, Vacio } from "../../components/ui";
import { fechaHora } from "../../lib/format";

const ROLES: { rol: Rol; texto: string }[] = [
  { rol: "USUARIO", texto: "Usuario" },
  { rol: "ANALISTA", texto: "Analista" },
  { rol: "ADMIN", texto: "Administrador" },
];

/** ADMIN only: who has an account, their role, and removing accounts. */
export function UsuariosPage() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? "1");
  const admin = esAdmin(usuario?.rol);
  // Non-admins never call GET /api/usuarios (it would answer 403).
  const usuarios = useUsuarios({ page }, admin);

  if (!admin) {
    return <ErrorMensaje error={null} texto="Solo un administrador puede ver los usuarios." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      {usuarios.isPending ? (
        <Cargando />
      ) : usuarios.isError ? (
        <ErrorMensaje error={usuarios.error} />
      ) : usuarios.data.data.length === 0 ? (
        <Vacio texto="No hay usuarios." />
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Correo</th>
                  <th className="px-4 py-2 font-medium">Rol</th>
                  <th className="px-4 py-2 font-medium">Alta</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {usuarios.data.data.map((u) => (
                  <FilaUsuario key={u.id} u={u} propio={u.id === usuario?.id} />
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion
            page={usuarios.data.page}
            pageSize={usuarios.data.pageSize}
            total={usuarios.data.total}
            onChange={(n) => setParams({ page: String(n) })}
          />
        </>
      )}
    </div>
  );
}

function FilaUsuario({ u, propio }: { u: UsuarioAdmin; propio: boolean }) {
  const { cognito } = useAuth();
  const cambiar = useCambiarRol();
  const eliminar = useEliminarUsuario();
  const error = cambiar.error ?? eliminar.error;

  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-800">
      <td className="px-4 py-2">
        {u.nombre}
        {propio && <span className="ml-2 text-xs text-slate-500">(tú)</span>}
      </td>
      <td className="px-4 py-2">{u.email}</td>
      <td className="px-4 py-2">
        <select
          className="input py-1"
          aria-label={`Rol de ${u.email}`}
          value={u.rol}
          // Your own role stays: an admin demoting itself would lock itself out of this page.
          disabled={propio || cambiar.isPending}
          onChange={(e) => cambiar.mutate({ id: u.id, rol: e.target.value as Rol })}
        >
          {ROLES.map((r) => (
            <option key={r.rol} value={r.rol}>
              {r.texto}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-slate-500">{fechaHora(u.creadoEn)}</td>
      <td className="px-4 py-2 text-right">
        {!propio && (
          <button
            type="button"
            className="text-sm text-red-600 underline dark:text-red-400"
            disabled={eliminar.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `¿Eliminar a ${u.email}? Se borran sus listas y alertas.` +
                    // Cognito keeps the sign-in account (backend D-41): a new sign-in recreates the row.
                    (cognito
                      ? " Su cuenta de acceso sigue existiendo: si vuelve a entrar, regresa como Usuario."
                      : ""),
                )
              )
                eliminar.mutate(u.id);
            }}
          >
            Eliminar
          </button>
        )}
        {error && <ErrorMensaje error={error} />}
      </td>
    </tr>
  );
}
