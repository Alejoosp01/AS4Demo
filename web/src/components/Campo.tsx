import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import "./Campo.css";

interface Base {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  ancho?: boolean;
}

function descritoPor(id: string, ayuda?: string, error?: string) {
  return [ayuda ? `${id}-ayuda` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
}

function Envoltura({ id, etiqueta, error, ayuda, ancho, children }: Base & { children: ReactNode }) {
  return (
    <div className={`campo${ancho ? " campo--ancho" : ""}${error ? " campo--error" : ""}`}>
      <label htmlFor={id}>{etiqueta}</label>
      {ayuda ? <p id={`${id}-ayuda`} className="campo__ayuda">{ayuda}</p> : null}
      {children}
      {error ? <p id={`${id}-error`} className="campo__error">{error}</p> : null}
    </div>
  );
}

export function Campo({ id, etiqueta, error, ayuda, ancho, ...input }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} ancho={ancho}>
      <input id={id} name={id} aria-invalid={error ? true : undefined} aria-describedby={descritoPor(id, ayuda, error)} {...input} />
    </Envoltura>
  );
}

export function AreaTexto({ id, etiqueta, error, ayuda, ...area }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} ancho>
      <textarea id={id} name={id} aria-invalid={error ? true : undefined} aria-describedby={descritoPor(id, ayuda, error)} {...area} />
    </Envoltura>
  );
}

interface SelectorProps extends Base, Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  opciones: { codigo: string; nombre: string }[];
  vacio?: string | false;
}

export function Selector({ id, etiqueta, error, ayuda, ancho, opciones, vacio = "Seleccione", ...select }: SelectorProps) {
  return (
    <Envoltura id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} ancho={ancho}>
      <select id={id} name={id} aria-invalid={error ? true : undefined} aria-describedby={descritoPor(id, ayuda, error)} {...select}>
        {vacio === false ? null : <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={o.codigo} value={o.codigo}>{o.nombre}</option>
        ))}
      </select>
    </Envoltura>
  );
}

interface OpcionesProps extends Base {
  valor: string;
  opciones: { codigo: string; nombre: string }[];
  onCambiar: (valor: string) => void;
}

/** Grupo de botones de opción. El id se pone en la primera opción para poder llevar el foco al error. */
export function Opciones({ id, etiqueta, error, ayuda, valor, opciones, onCambiar }: OpcionesProps) {
  return (
    <fieldset className={`grupo-opciones${error ? " grupo-opciones--error" : ""}`} aria-describedby={descritoPor(id, ayuda, error)}>
      <legend>{etiqueta}</legend>
      {ayuda ? <p id={`${id}-ayuda`} className="campo__ayuda">{ayuda}</p> : null}
      <div className="grupo-opciones__lista">
        {opciones.map((o, i) => (
          <label key={o.codigo} className="opcion">
            <input
              type="radio"
              id={i === 0 ? id : undefined}
              name={id}
              value={o.codigo}
              checked={valor === o.codigo}
              onChange={() => onCambiar(o.codigo)}
            />
            <span>{o.nombre}</span>
          </label>
        ))}
      </div>
      {error ? <p id={`${id}-error`} className="campo__error">{error}</p> : null}
    </fieldset>
  );
}

export const SI_NO = [
  { codigo: "si", nombre: "Sí" },
  { codigo: "no", nombre: "No" },
];

interface CasillaProps {
  id: string;
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
  error?: string;
  children: ReactNode;
}

export function Casilla({ id, marcada, onCambiar, error, children }: CasillaProps) {
  return (
    <div className={`casilla${error ? " casilla--error" : ""}`}>
      <label className="opcion">
        <input
          type="checkbox"
          id={id}
          name={id}
          checked={marcada}
          onChange={(e) => onCambiar(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span>{children}</span>
      </label>
      {error ? <p id={`${id}-error`} className="campo__error">{error}</p> : null}
    </div>
  );
}
