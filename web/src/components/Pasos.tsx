import type React from "react";
import { Icono, type NombreIcono } from "./Icono";
import "./Pasos.css";

// Las etapas del cliente en el proceso TO-BE, con la tarea de la matriz a la que corresponde cada una.
const PASOS: { nombre: string; tarea: string; icono: NombreIcono }[] = [
  { nombre: "Solicitud", tarea: "T01", icono: "usuario" },
  { nombre: "Conocimiento del cliente", tarea: "T03", icono: "escudo" },
  { nombre: "Datos del seguro", tarea: "T04", icono: "lista" },
  { nombre: "Comparativo", tarea: "T08–T09", icono: "comparar" },
  { nombre: "Aceptación y firma", tarea: "T10", icono: "asesoria" },
  { nombre: "Suscripción y pago", tarea: "T11–T12", icono: "edificio" },
  { nombre: "Póliza", tarea: "T13–T14", icono: "poliza" },
];

export function Pasos({ actual }: { actual: 1 | 2 | 3 | 4 | 5 | 6 | 7 }) {
  const avance = (actual - 1) / (PASOS.length - 1);
  return (
    <nav className="pasos-contenedor no-imprimir" aria-label="Pasos de la solicitud">
      <p className="pasos__resumen">
        <span>Paso {actual} de {PASOS.length}</span>
        <strong>{PASOS[actual - 1].nombre}</strong>
        <span className="pasos__porcentaje">{Math.round((actual / PASOS.length) * 100)} %</span>
      </p>
      <ol className="pasos" style={{ "--avance": avance } as React.CSSProperties}>
        {PASOS.map((paso, i) => {
          const numero = i + 1;
          const clase = numero === actual ? "pasos__paso--actual" : numero < actual ? "pasos__paso--hecho" : "";
          return (
            <li key={paso.nombre} className={clase} aria-current={numero === actual ? "step" : undefined} title={`Tarea ${paso.tarea} del proceso`}>
              <span className="pasos__circulo" aria-hidden="true">
                {numero < actual ? <Icono nombre="ok" tamano={16} /> : <Icono nombre={paso.icono} tamano={16} />}
              </span>
              <span className="pasos__nombre">{numero}. {paso.nombre}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
