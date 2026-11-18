import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Aviso } from "../components/Aviso";
import { Icono, type NombreIcono } from "../components/Icono";
import { TopBar } from "../components/TopBar";
import { useConteo } from "../hooks/useConteo";
import { useSesion } from "../sesion/Sesion";
import { CUENTAS_DEMO, useEntrarComo } from "./entrarComo";
import { ETAPAS, MISIONES, NOMBRE_ROL, type RolDemo } from "./flujo";
import { MapaFlujo } from "./MapaFlujo";
import { reiniciarMisiones, useMisiones } from "./misiones";
import { Quiz } from "./Quiz";
import "./Demo.css";

const ROLES: { rol: RolDemo; icono: NombreIcono; titulo: string; quien: string; texto: string; ruta: string; boton: string }[] = [
  { rol: "CLIENTE", icono: "usuario", titulo: "Cliente", quien: "Sin iniciar sesión", texto: "Pide su seguro, compara 8 aseguradoras, firma, paga, reporta siniestros y renueva desde un solo enlace.", ruta: "/solicitud", boton: "Empezar como cliente" },
  { rol: "ASESOR", icono: "asesoria", titulo: "Asesor comercial", quien: CUENTAS_DEMO.ASESOR.nombre, texto: "Solo ve lo que le toca: asesorar, acompañar siniestros, destrabar clientes y llamar por renovaciones.", ruta: "/asesor", boton: "Entrar como asesora" },
  { rol: "GERENTE", icono: "tablero", titulo: "Gerencia", quien: CUENTAS_DEMO.GERENTE.nombre, texto: "Mide el proceso con seis variables, controla la imparcialidad y sigue los vencimientos de la cartera.", ruta: "/gerencia", boton: "Entrar como gerente" },
];

const CIFRAS: { valor: number; sufijo: string; texto: string }[] = [
  { valor: 8, sufijo: "", texto: "aseguradoras en un solo comparativo" },
  { valor: 91, sufijo: " %", texto: "menos tiempo operativo del asesor" },
  { valor: 27, sufijo: "", texto: "tareas del proceso; solo 3 quedan al asesor" },
  { valor: 30, sufijo: " días", texto: "antes del vencimiento se recotiza sola la renovación" },
];

function Cifra({ valor, sufijo, texto, i }: (typeof CIFRAS)[number] & { i: number }) {
  const n = useConteo(valor, 1200);
  return (
    <div className="demo__cifra en-cascada" style={{ "--i": i } as React.CSSProperties}>
      <strong>{n}{sufijo}</strong><span>{texto}</span>
    </div>
  );
}

/** Página de inicio de la demostración: flujo completo, entrada por rol, misiones y juego. */
export function CentroDemo() {
  const { usuario, salir } = useSesion();
  const [etapa, setEtapa] = useState(1);
  const cumplidas = useMisiones();
  const { entrar, ocupado, error } = useEntrarComo();
  const total = MISIONES.filter((m) => cumplidas.has(m.id)).length;
  const actual = ETAPAS[etapa - 1];

  return (
    <>
      <TopBar usuario={usuario ?? undefined} onSalir={usuario ? () => void salir() : undefined} />
      <main className="demo">
        <section className="demo__hero">
          <div className="demo__hero-texto">
            <p className="demo__etiqueta"><Icono nombre="brujula" tamano={16} /> Recorrido guiado de la demostración</p>
            <h1>Así funciona AS4 Compara, de la solicitud a la renovación</h1>
            <p>
              Explore el proceso TO-BE completo (27 tareas, T01 a T17) con los tres roles. Reproduzca el flujo, entre con un clic en cada rol
              y cumpla las misiones: la guía de la esquina inferior izquierda le explica cada pantalla mientras avanza.
            </p>
            <div className="demo__progreso-global">
              <span className="demo__progreso-barra" aria-hidden="true"><span style={{ width: `${(total / MISIONES.length) * 100}%` }} /></span>
              <span>{total} de {MISIONES.length} misiones cumplidas</span>
            </div>
          </div>
          <div className="demo__cifras">
            {CIFRAS.map((c, i) => <Cifra key={c.texto} {...c} i={i} />)}
          </div>
        </section>

        {error ? <Aviso tipo="error"><p>{error}</p></Aviso> : null}

        <section className="demo__seccion" aria-labelledby="titulo-roles">
          <h2 id="titulo-roles">1. Elija con qué rol empezar</h2>
          <div className="demo__roles">
            {ROLES.map((r, i) => {
              const propias = MISIONES.filter((m) => m.rol === r.rol);
              const hechas = propias.filter((m) => cumplidas.has(m.id)).length;
              return (
                <article key={r.rol} className={`demo__rol demo__rol--${r.rol.toLowerCase()} en-cascada`} style={{ "--i": i } as React.CSSProperties}>
                  <span className="demo__rol-icono"><Icono nombre={r.icono} tamano={28} /></span>
                  <h3>{r.titulo}</h3>
                  <p className="demo__rol-quien">{r.quien}</p>
                  <p>{r.texto}</p>
                  <div className="demo__rol-misiones">
                    <span className="demo__progreso-barra" aria-hidden="true"><span style={{ width: `${(hechas / propias.length) * 100}%` }} /></span>
                    <span className="texto-secundario">{hechas}/{propias.length} misiones</span>
                  </div>
                  <button type="button" className="boton boton--principal" disabled={ocupado} onClick={() => void entrar(r.rol, r.ruta)}>
                    {r.boton}<Icono nombre="flecha" tamano={16} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="demo__seccion" aria-labelledby="titulo-flujo">
          <div className="demo__seccion-cabecera">
            <h2 id="titulo-flujo">2. El flujo completo del programa</h2>
            <button type="button" className="boton boton--secundario boton--compacto" disabled={ocupado}
              onClick={() => void entrar(actual.probar.rol, actual.probar.ruta)}>
              Probar esta etapa como {NOMBRE_ROL[actual.probar.rol].toLowerCase()}: {actual.probar.texto.toLowerCase()}<Icono nombre="flecha" tamano={15} />
            </button>
          </div>
          <p className="texto-secundario">Cada columna es una etapa y cada fila un actor. Pulse una etapa o reproduzca el flujo para verlo avanzar.</p>
          <MapaFlujo etapa={etapa} onCambiar={setEtapa} />
        </section>

        <section className="demo__seccion" aria-labelledby="titulo-misiones">
          <div className="demo__seccion-cabecera">
            <h2 id="titulo-misiones">3. Misiones por rol</h2>
            <button type="button" className="boton boton--enlace" onClick={reiniciarMisiones}>Reiniciar misiones</button>
          </div>
          <p className="texto-secundario">Se marcan solas a medida que recorre la aplicación. Pase el cursor por una misión para ver la pista.</p>
          <div className="demo__misiones">
            {ROLES.map((r) => (
              <div key={r.rol} className="demo__grupo">
                <h3><Icono nombre={r.icono} tamano={18} /> {r.titulo}</h3>
                <ul>
                  {MISIONES.filter((m) => m.rol === r.rol).map((m) => (
                    <li key={m.id} className={cumplidas.has(m.id) ? "demo__mision demo__mision--hecha" : "demo__mision"} title={m.pista}>
                      <span className="demo__check" aria-hidden="true">{cumplidas.has(m.id) ? <Icono nombre="ok" tamano={14} /> : null}</span>
                      <span>
                        {m.texto}
                        <span className="visualmente-oculto">{cumplidas.has(m.id) ? " (cumplida)" : " (pendiente)"}</span>
                        <span className="demo__pista">{m.pista}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="demo__seccion" aria-labelledby="titulo-quiz">
          <h2 id="titulo-quiz">4. Ponga a prueba lo aprendido</h2>
          <p className="texto-secundario">¿Quién hace cada tarea en el proceso TO-BE? Elija el actor y vea la explicación.</p>
          <Quiz />
        </section>

        <section className="demo__seccion demo__accesos" aria-labelledby="titulo-accesos">
          <h2 id="titulo-accesos">Accesos y datos de prueba</h2>
          <ul>
            <li>Cliente: <Link to="/solicitud">/solicitud</Link> (sin iniciar sesión).</li>
            <li>Asesor: {CUENTAS_DEMO.ASESOR.correo} · {CUENTAS_DEMO.ASESOR.clave}</li>
            <li>Gerencia: {CUENTAS_DEMO.GERENTE.correo} · {CUENTAS_DEMO.GERENTE.clave}</li>
            <li>Documento <code>1000000001</code>: simula una coincidencia en listas restrictivas (SARLAFT).</li>
            <li>Las aseguradoras, tarifas, clientes y pólizas son ficticios. <Link to="/ingreso">Ir al ingreso tradicional</Link>.</li>
          </ul>
        </section>
      </main>
    </>
  );
}
