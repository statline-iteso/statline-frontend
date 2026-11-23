import type { ReactNode } from "react";

/** Generation button with its pending state and result line (role="status"). */
export function GenerarBoton({
  etiqueta,
  pendiente,
  onClick,
  resultado,
}: {
  etiqueta: string;
  pendiente: boolean;
  onClick: () => void;
  resultado: ReactNode;
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <button className="btn" disabled={pendiente} onClick={onClick}>
        {pendiente ? "Generando…" : etiqueta}
      </button>
      <div role="status" className="text-sm text-slate-600 dark:text-slate-300">
        {resultado}
      </div>
    </div>
  );
}
