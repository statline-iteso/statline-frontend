import { Link } from "react-router-dom";

export function NoEncontrado() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <Link to="/" className="mt-4 inline-block text-sky-700 underline">
        Volver al inicio
      </Link>
    </div>
  );
}
