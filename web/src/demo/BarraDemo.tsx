import { Icono } from "../components/Icono";
import "./Demo.css";

/** Franja de la demostración para llenar un formulario con datos ficticios y avanzar rápido. */
export function BarraDemo({ texto, onLlenar }: { texto: string; onLlenar: () => void }) {
  return (
    <div className="barra-demo no-imprimir">
      <Icono nombre="estrella" tamano={16} />
      <span>{texto}</span>
      <button type="button" className="boton boton--secundario boton--compacto" onClick={onLlenar}>Llenar con datos de ejemplo</button>
    </div>
  );
}
