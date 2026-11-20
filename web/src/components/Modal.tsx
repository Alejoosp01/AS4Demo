import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icono, type NombreIcono } from "./Icono";
import "./Modal.css";

interface ModalProps {
  abierto: boolean;
  titulo: string;
  icono?: NombreIcono;
  tono?: "info" | "alerta" | "urgente";
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: number;
}

/** Ventana emergente accesible: atrapa el foco, se cierra con Escape o al hacer clic en el fondo. */
export function Modal({ abierto, titulo, icono, tono = "info", onCerrar, children, pie, ancho = 560 }: ModalProps) {
  const caja = useRef<HTMLDivElement>(null);
  const anterior = useRef<Element | null>(null);

  useEffect(() => {
    if (!abierto) return;
    anterior.current = document.activeElement;
    const primero = caja.current?.querySelector<HTMLElement>("[data-foco-inicial], button, a[href]");
    primero?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      if (e.key !== "Tab" || !caja.current) return;
      const focos = caja.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input, select, textarea");
      if (focos.length === 0) return;
      const [ini, fin] = [focos[0], focos[focos.length - 1]];
      if (e.shiftKey && document.activeElement === ini) { e.preventDefault(); fin.focus(); }
      else if (!e.shiftKey && document.activeElement === fin) { e.preventDefault(); ini.focus(); }
    };
    document.addEventListener("keydown", alTeclear);
    document.body.classList.add("con-modal");
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.classList.remove("con-modal");
      (anterior.current as HTMLElement | null)?.focus?.();
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return createPortal(
    <div className="modal no-imprimir" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div ref={caja} className={`modal__caja modal__caja--${tono}`} role="dialog" aria-modal="true" aria-labelledby="modal-titulo" style={{ maxWidth: ancho }}>
        <header className="modal__cabecera">
          {icono ? <span className="modal__icono"><Icono nombre={icono} tamano={24} /></span> : null}
          <h2 id="modal-titulo">{titulo}</h2>
          <button type="button" className="modal__cerrar" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" tamano={18} /></button>
        </header>
        <div className="modal__cuerpo">{children}</div>
        {pie ? <footer className="modal__pie">{pie}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
