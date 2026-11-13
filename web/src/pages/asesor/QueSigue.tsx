import type { SiguientePaso } from "../../api/tipos";

const QUIEN = { ASESOR: "Usted", CLIENTE: "Cliente", NADIE: "" };

/** Etiqueta corta de la bandeja: qué sigue en la solicitud y a quién le toca. */
export function QueSigue({ paso }: { paso: Pick<SiguientePaso, "codigo" | "responsable" | "titulo"> }) {
  if (paso.responsable === "NADIE") return <span className="texto-secundario">—</span>;
  return (
    <span className={`que-sigue que-sigue--${paso.responsable.toLowerCase()}`}>
      <span className="que-sigue__quien">{QUIEN[paso.responsable]}</span>
      {paso.titulo}
    </span>
  );
}
