import type { ReactNode } from "react";
import logo from "../assets/logo-as4.png";
import "./TopBar.css";

interface TopBarProps {
  usuario?: { nombre: string; rol: "ASESOR" | "GERENTE" };
  onSalir?: () => void;
  extra?: ReactNode;
}

const ROL = { ASESOR: "Asesor comercial", GERENTE: "Gerencia" };

export function TopBar({ usuario, onSalir, extra }: TopBarProps) {
  return (
    <header className="top-bar">
      <span className="top-bar__marca">
        <img src={logo} alt="" width={42} height={42} />
        <span>
          <span className="top-bar__agency">AS4 SEGUROS LTDA</span>
          <span className="top-bar__producto">AS4 Compara</span>
        </span>
      </span>
      {usuario ? (
        <span className="top-bar__user">
          {extra}
          <span>
            {usuario.nombre}
            <span className="top-bar__rol">{ROL[usuario.rol]}</span>
          </span>
          {onSalir ? <button type="button" className="top-bar__salir no-imprimir" onClick={onSalir}>Salir</button> : null}
        </span>
      ) : null}
    </header>
  );
}
