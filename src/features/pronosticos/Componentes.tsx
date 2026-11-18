import type { ReactNode } from "react";
import { ErrorMensaje } from "../../components/ui";
import { esSintetico, mensajeError } from "./util";

/** Error with the friendly text for prediction API codes. */
export function ErrorPronostico({ error }: { error: unknown }) {
  return <ErrorMensaje error={new Error(mensajeError(error))} />;
}

/** Badge shown when a model was trained on synthetic data. Renders nothing otherwise. */
export function InsigniaSintetico({ version }: { version: string }) {
  if (!esSintetico(version)) return null;
  return (
    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
      datos sintéticos
    </span>
  );
}

/** Label/value pair inside a precision card. */
export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{etiqueta}</dt>
      <dd className="text-lg font-semibold tabular-nums">{children}</dd>
    </div>
  );
}
