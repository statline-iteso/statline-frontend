import type { Rol } from "../api/types";

/** Roles allowed to run generation endpoints (POST .../generar). */
export const puedeGenerar = (rol: Rol | undefined) => rol === "ANALISTA" || rol === "ADMIN";

/** Roles allowed to manage models (activar, reentrenar). */
export const esAdmin = (rol: Rol | undefined) => rol === "ADMIN";
