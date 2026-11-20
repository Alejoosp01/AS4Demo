import { useState } from "react";
import { Icono } from "../components/Icono";
import { ACTORES, type Actor } from "./flujo";

const PREGUNTAS: { texto: string; respuesta: Actor; porque: string }[] = [
  { texto: "Ordenar el comparativo de las 8 aseguradoras", respuesta: "PLATAFORMA", porque: "El motor ordena por cobertura y precio; nadie lo hace a mano y la comisión no interviene." },
  { texto: "Escribir el criterio de la recomendación", respuesta: "ASESOR", porque: "Es obligatorio y no editable (T09): deja constancia de por qué se recomendó esa oferta." },
  { texto: "Diligenciar el SARLAFT", respuesta: "CLIENTE", porque: "El cliente lo llena una sola vez y sirve para todas las aseguradoras (T03)." },
  { texto: "Recordar al cliente que faltan datos a las 24 horas", respuesta: "PLATAFORMA", porque: "El seguimiento automático (T07) recuerda, alerta al asesor a las 48 h y cierra a los 5 días hábiles." },
  { texto: "Aprobar la póliza con o sin condiciones", respuesta: "ASEGURADORA", porque: "La suscripción (T11) es de la aseguradora; en la demo responde con reglas fijas." },
  { texto: "Digitar la póliza emitida en el sistema", respuesta: "PLATAFORMA", porque: "Emisión, entrega y registro de la venta son automáticos (T13–T14): el asesor no digita nada." },
  { texto: "Llamar cuando una renovación lleva 5 días sin respuesta", respuesta: "ASESOR", porque: "Es una de las pocas tareas que el TO-BE deja al asesor (T15)." },
  { texto: "Revisar que ninguna aseguradora supere el 40 % de las ventas", respuesta: "GERENCIA", porque: "El control de imparcialidad del tablero (T17) avisa a gerencia." },
  { texto: "Decidir si renueva y con qué aseguradora", respuesta: "CLIENTE", porque: "La decisión es del cliente desde su enlace (T16); el asesor solo la registra si llega por teléfono." },
];

/** Juego corto para fijar quién hace cada tarea en el proceso TO-BE. */
export function Quiz() {
  const [indice, setIndice] = useState(0);
  const [elegida, setElegida] = useState<Actor | null>(null);
  const [aciertos, setAciertos] = useState(0);
  const terminado = indice >= PREGUNTAS.length;
  const p = PREGUNTAS[indice];

  function responder(actor: Actor) {
    if (elegida) return;
    setElegida(actor);
    if (actor === p.respuesta) setAciertos((a) => a + 1);
  }

  function siguiente() {
    setElegida(null);
    setIndice((i) => i + 1);
  }

  function reiniciar() {
    setIndice(0);
    setElegida(null);
    setAciertos(0);
  }

  if (terminado) {
    const nota = aciertos === PREGUNTAS.length ? "¡Perfecto! Domina el proceso TO-BE." : aciertos >= 6 ? "¡Muy bien! Ya entiende quién hace qué." : "Repase el mapa del flujo y vuelva a intentarlo.";
    return (
      <div className="quiz quiz--final">
        <p className="quiz__puntaje"><strong>{aciertos}</strong> de {PREGUNTAS.length}</p>
        <p>{nota}</p>
        <button type="button" className="boton boton--principal" onClick={reiniciar}>Jugar otra vez</button>
      </div>
    );
  }

  return (
    <div className="quiz">
      <div className="quiz__cabecera">
        <span className="texto-secundario">Pregunta {indice + 1} de {PREGUNTAS.length}</span>
        <span className="quiz__aciertos"><Icono nombre="estrella" tamano={15} /> {aciertos}</span>
      </div>
      <span className="quiz__barra" aria-hidden="true"><span style={{ width: `${(indice / PREGUNTAS.length) * 100}%` }} /></span>
      <p className="quiz__pregunta" key={indice}>¿Quién se encarga de <strong>{p.texto.charAt(0).toLowerCase() + p.texto.slice(1)}</strong>?</p>
      <div className="quiz__opciones" role="group" aria-label="Opciones">
        {ACTORES.map((a) => {
          const estado = !elegida ? "" : a.codigo === p.respuesta ? " quiz__opcion--correcta" : a.codigo === elegida ? " quiz__opcion--incorrecta" : " quiz__opcion--apagada";
          return (
            <button key={a.codigo} type="button" className={`quiz__opcion${estado}`} onClick={() => responder(a.codigo)} disabled={Boolean(elegida)}>
              <Icono nombre={a.icono} tamano={20} />{a.nombre}
            </button>
          );
        })}
      </div>
      {elegida ? (
        <div className={`quiz__explicacion${elegida === p.respuesta ? " quiz__explicacion--ok" : ""}`} role="status">
          <p><strong>{elegida === p.respuesta ? "¡Correcto!" : `No: lo hace ${ACTORES.find((a) => a.codigo === p.respuesta)?.nombre.toLowerCase()}.`}</strong> {p.porque}</p>
          <button type="button" className="boton boton--principal boton--compacto" onClick={siguiente} autoFocus>
            {indice + 1 === PREGUNTAS.length ? "Ver resultado" : "Siguiente"}<Icono nombre="flecha" tamano={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
