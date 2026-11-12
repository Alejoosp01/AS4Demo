import "./Pasos.css";

const PASOS = ["Solicitud", "Datos del seguro", "Comparativo", "Aceptación"];

export function Pasos({ actual }: { actual: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="pasos no-imprimir" aria-label="Pasos de la solicitud">
      {PASOS.map((nombre, i) => {
        const numero = i + 1;
        const clase = numero === actual ? "pasos__paso--actual" : numero < actual ? "pasos__paso--hecho" : "";
        return (
          <li key={nombre} className={clase} aria-current={numero === actual ? "step" : undefined}>
            {numero}. {nombre}
          </li>
        );
      })}
    </ol>
  );
}
