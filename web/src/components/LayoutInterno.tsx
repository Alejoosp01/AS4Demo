import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSesion } from "../sesion/Sesion";
import { TopBar } from "./TopBar";
import "./LayoutInterno.css";

const MENU = {
  ASESOR: [
    { a: "/asesor", texto: "Mi trabajo", fin: true },
    { a: "/asesor/solicitudes", texto: "Solicitudes" },
    { a: "/asesor/renovaciones", texto: "Renovaciones" },
  ],
  GERENTE: [
    { a: "/gerencia", texto: "Tablero", fin: true },
    { a: "/gerencia/imparcialidad", texto: "Imparcialidad" },
  ],
};

export function LayoutInterno({ children }: { children: ReactNode }) {
  const { usuario, salir } = useSesion();
  const navegar = useNavigate();
  if (!usuario) return null;

  async function cerrar() {
    await salir();
    navegar("/ingreso");
  }

  return (
    <>
      <TopBar usuario={usuario} onSalir={cerrar} />
      <div className="interno">
        <nav className="menu no-imprimir" aria-label="Menú principal">
          <ul>
            {MENU[usuario.rol].map((item) => (
              <li key={item.a}>
                <NavLink to={item.a} end={item.fin}>{item.texto}</NavLink>
              </li>
            ))}
          </ul>
          {usuario.rol === "ASESOR" ? (
            <div className="menu__accion">
              <a className="boton boton--secundario" href="/solicitud" target="_blank" rel="noreferrer">Nueva solicitud</a>
              <p>Abre el formulario del cliente en otra pestaña.</p>
            </div>
          ) : null}
        </nav>
        <main className="interno__contenido">{children}</main>
      </div>
    </>
  );
}
