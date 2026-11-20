import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAviso } from "../components/Avisos";
import { Icono } from "../components/Icono";
import { useSesion } from "../sesion/Sesion";
import { ETAPAS, MISIONES, NOMBRE_ROL, type RolDemo, pantallaDe } from "./flujo";
import { MapaFlujo } from "./MapaFlujo";
import { completarPorRuta, useEtapaCliente, useMisiones } from "./misiones";
import "./Demo.css";

const CLAVE_ABIERTA = "as4-guia-abierta";

/**
 * Botón flotante con la guía de la demostración: explica la pantalla actual, la ubica en el flujo
 * y muestra las misiones del rol. También celebra cada misión cumplida.
 */
export function GuiaFlotante() {
  const { pathname } = useLocation();
  const { usuario } = useSesion();
  const etapaCliente = useEtapaCliente();
  const cumplidas = useMisiones();
  const avisar = useAviso();
  const [abierta, setAbierta] = useState(() => {
    try { return localStorage.getItem(CLAVE_ABIERTA) === "1"; } catch { return false; }
  });

  useEffect(() => { completarPorRuta(pathname); }, [pathname]);

  useEffect(() => {
    const alCumplir = (e: Event) => avisar(`Misión cumplida: ${(e as CustomEvent<string>).detail}`);
    window.addEventListener("as4-mision", alCumplir);
    return () => window.removeEventListener("as4-mision", alCumplir);
  }, [avisar]);

  function alternar(valor: boolean) {
    setAbierta(valor);
    try { localStorage.setItem(CLAVE_ABIERTA, valor ? "1" : "0"); } catch { /* sin almacenamiento */ }
  }

  if (pathname === "/demo") return null;

  const pantalla = pantallaDe(pathname, etapaCliente);
  const rol: RolDemo = pantalla?.rol ?? (usuario?.rol ?? "CLIENTE");
  const misiones = MISIONES.filter((m) => m.rol === rol);
  const hechas = misiones.filter((m) => cumplidas.has(m.id)).length;
  const total = MISIONES.filter((m) => cumplidas.has(m.id)).length;

  return (
    <div className="guia no-imprimir">
      {abierta ? (
        <aside className="guia__panel" aria-label="Guía de la demostración">
          <header className="guia__cabecera">
            <span><Icono nombre="brujula" tamano={18} /> Guía de la demo</span>
            <button type="button" className="modal__cerrar" onClick={() => alternar(false)} aria-label="Cerrar la guía"><Icono nombre="cerrar" tamano={16} /></button>
          </header>
          <div className="guia__cuerpo">
            {pantalla ? (
              <>
                <p className="guia__donde">Está en <strong>{pantalla.titulo}</strong> · rol <strong>{NOMBRE_ROL[pantalla.rol].toLowerCase()}</strong></p>
                <MapaFlujo etapa={pantalla.etapa} onCambiar={() => undefined} compacto />
                <p className="guia__etapa">Etapa {pantalla.etapa}: {ETAPAS[pantalla.etapa - 1].nombre} ({ETAPAS[pantalla.etapa - 1].tareas})</p>
                <p>{pantalla.explicacion}</p>
                <h4>Pruebe esto</h4>
                <ul className="guia__pruebe">{pantalla.pruebe.map((t) => <li key={t}>{t}</li>)}</ul>
              </>
            ) : (
              <p>Elija un rol en el centro de la demo para empezar el recorrido.</p>
            )}
            <h4>Misiones de {NOMBRE_ROL[rol].toLowerCase()} ({hechas}/{misiones.length})</h4>
            <ul className="guia__misiones">
              {misiones.map((m) => (
                <li key={m.id} className={cumplidas.has(m.id) ? "demo__mision demo__mision--hecha" : "demo__mision"}>
                  <span className="demo__check" aria-hidden="true">{cumplidas.has(m.id) ? <Icono nombre="ok" tamano={12} /> : null}</span>
                  <span>{m.texto}<span className="demo__pista">{m.pista}</span></span>
                </li>
              ))}
            </ul>
            <Link className="boton boton--secundario boton--compacto guia__centro" to="/demo">
              <Icono nombre="brujula" tamano={15} />Centro de la demo y otros roles
            </Link>
          </div>
        </aside>
      ) : null}
      <button type="button" className="guia__boton" onClick={() => alternar(!abierta)} aria-expanded={abierta}
        aria-label={abierta ? "Ocultar la guía de la demo" : "Abrir la guía de la demo"}>
        <Icono nombre={abierta ? "cerrar" : "brujula"} tamano={22} />
        <span className="guia__texto">Guía</span>
        <span className="guia__contador">{total}/{MISIONES.length}</span>
      </button>
    </div>
  );
}
