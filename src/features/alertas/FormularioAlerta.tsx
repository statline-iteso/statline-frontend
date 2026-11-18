import { useState, type FormEvent } from "react";
import { useCrearAlerta, useEquipos } from "../../api/queries";
import { OPERADORES, type TipoAlerta } from "../../api/types";
import { NombreJugador } from "../../components/Referencias";
import { SelectorJugador } from "../../components/SelectorJugador";
import { ErrorMensaje } from "../../components/ui";
import { erroresDeCampo } from "../../lib/errores";
import { METRICAS_POR_DEPORTE } from "../partidos/metricas";
import {
  CAMPOS_SERVIDOR,
  construirAlerta,
  ETIQUETA_TIPO_ALERTA,
  FORM_ALERTA_INICIAL,
  validarAlerta,
  type ErroresAlerta,
  type FormAlerta,
} from "./validacion";

const TIPOS = Object.keys(ETIQUETA_TIPO_ALERTA) as TipoAlerta[];

export function FormularioAlerta() {
  const [f, setF] = useState<FormAlerta>(FORM_ALERTA_INICIAL);
  const [errores, setErrores] = useState<ErroresAlerta>({});
  const [creada, setCreada] = useState(false);
  const crear = useCrearAlerta();
  const equipos = useEquipos();

  const cambiar = (cambios: Partial<FormAlerta>) => {
    setF((prev) => ({ ...prev, ...cambios }));
    setCreada(false);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const locales = validarAlerta(f);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;
    crear.mutate(construirAlerta(f), {
      onSuccess: () => {
        setF(FORM_ALERTA_INICIAL);
        setErrores({});
        setCreada(true);
      },
    });
  };

  // Field messages from the server take precedence over stale local ones.
  const porServidor: ErroresAlerta = {};
  for (const [campo, mensaje] of Object.entries(erroresDeCampo(crear.error))) {
    const destino = CAMPOS_SERVIDOR[campo];
    if (destino) porServidor[destino] = mensaje;
  }
  const mostrar: ErroresAlerta = { ...errores, ...porServidor };

  const jugadorAplica = f.tipo !== "INICIO_PARTIDO" || f.objetivo === "JUGADOR";
  const metricas = f.jugador ? METRICAS_POR_DEPORTE[f.jugador.deporte] : [];

  return (
    <form className="card space-y-4" onSubmit={enviar} noValidate>
      <h2 className="text-lg font-semibold">Nueva alerta</h2>

      <label className="block text-sm">
        Tipo de alerta
        <select
          className="input mt-1"
          value={f.tipo}
          onChange={(e) => {
            setErrores({});
            cambiar({ tipo: e.target.value as TipoAlerta });
          }}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO_ALERTA[t]}
            </option>
          ))}
        </select>
      </label>

      {f.tipo === "INICIO_PARTIDO" && (
        <label className="block text-sm">
          Aplica a
          <select
            className="input mt-1"
            value={f.objetivo}
            onChange={(e) => cambiar({ objetivo: e.target.value as FormAlerta["objetivo"] })}
          >
            <option value="JUGADOR">Un jugador</option>
            <option value="EQUIPO">Un equipo</option>
          </select>
        </label>
      )}

      {jugadorAplica && (
        <div className="space-y-2">
          {f.jugador ? (
            <p className="text-sm">
              Jugador:{" "}
              <span className="font-medium">
                <NombreJugador id={f.jugador.id} />
              </span>{" "}
              <button
                type="button"
                className="ml-2 text-sky-700 underline dark:text-sky-400"
                onClick={() => cambiar({ jugador: null, metrica: "" })}
              >
                Cambiar
              </button>
            </p>
          ) : (
            <SelectorJugador
              accion="Elegir"
              onSeleccionar={(j) =>
                cambiar({
                  jugador: { id: j.id, nombre: j.nombre, deporte: j.deporte },
                  metrica: "",
                })
              }
            />
          )}
          {mostrar.jugadorId && <Campo error={mostrar.jugadorId} />}
        </div>
      )}

      {f.tipo === "INICIO_PARTIDO" && f.objetivo === "EQUIPO" && (
        <div className="space-y-2">
          <label className="block text-sm">
            Equipo
            <select
              className="input mt-1"
              value={f.equipoId}
              disabled={equipos.isPending || equipos.isError}
              onChange={(e) => cambiar({ equipoId: e.target.value })}
            >
              <option value="">Elige un equipo</option>
              {(equipos.data?.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>
          {equipos.isError && <ErrorMensaje error={equipos.error} />}
          {mostrar.equipoId && <Campo error={mostrar.equipoId} />}
        </div>
      )}

      {f.tipo === "UMBRAL" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-sm">
              Métrica
              <select
                className="input mt-1"
                value={f.metrica}
                disabled={!f.jugador}
                onChange={(e) => cambiar({ metrica: e.target.value })}
              >
                <option value="">
                  {f.jugador ? "Elige una métrica" : "Elige un jugador primero"}
                </option>
                {metricas.map((m) => (
                  <option key={m.clave} value={m.clave}>
                    {m.titulo}
                  </option>
                ))}
              </select>
            </label>
            {mostrar.metrica && <Campo error={mostrar.metrica} />}
          </div>
          <label className="block text-sm">
            Operador
            <select
              className="input mt-1"
              value={f.operador}
              onChange={(e) => cambiar({ operador: e.target.value as FormAlerta["operador"] })}
            >
              {OPERADORES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1">
            <label className="block text-sm">
              Valor
              <input
                className="input mt-1"
                type="number"
                step="any"
                value={f.valor}
                aria-invalid={mostrar.valor ? true : undefined}
                onChange={(e) => cambiar({ valor: e.target.value })}
              />
            </label>
            {mostrar.valor && <Campo error={mostrar.valor} />}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" type="submit" disabled={crear.isPending}>
          Crear alerta
        </button>
        {creada && (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            Alerta creada.
          </p>
        )}
      </div>
      {crear.isError && <ErrorMensaje error={crear.error} />}
    </form>
  );
}

function Campo({ error }: { error: string }) {
  return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
}
