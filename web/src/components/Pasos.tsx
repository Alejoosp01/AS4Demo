import "./Pasos.css";

// Las etapas del cliente en el proceso TO-BE, con la tarea de la matriz a la que corresponde cada una.
const PASOS = [
  { nombre: "Solicitud", tarea: "T01" },
  { nombre: "Conocimiento del cliente", tarea: "T03" },
  { nombre: "Datos del seguro", tarea: "T04" },
  { nombre: "Comparativo", tarea: "T08–T09" },
  { nombre: "Aceptación y firma", tarea: "T10" },
  { nombre: "Suscripción y pago", tarea: "T11–T12" },
  { nombre: "Póliza", tarea: "T13–T14" },
];

export function Pasos({ actual }: { actual: 1 | 2 | 3 | 4 | 5 | 6 | 7 }) {
  return (
    <ol className="pasos no-imprimir" aria-label="Pasos de la solicitud">
      {PASOS.map((paso, i) => {
        const numero = i + 1;
        const clase = numero === actual ? "pasos__paso--actual" : numero < actual ? "pasos__paso--hecho" : "";
        return (
          <li key={paso.nombre} className={clase} aria-current={numero === actual ? "step" : undefined} title={`Tarea ${paso.tarea} del proceso`}>
            {numero}. {paso.nombre}
          </li>
        );
      })}
    </ol>
  );
}
