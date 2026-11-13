import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSesion } from "../sesion/Sesion";
import { Icono, type NombreIcono } from "./Icono";
import { TopBar } from "./TopBar";
import "./LayoutInterno.css";

const MENU: Record<"ASESOR" | "GERENTE", { a: string; texto: string; icono: NombreIcono; fin?: boolean }[]> = {
  ASESOR: [
    { a: "/asesor", texto: "Mi trabajo", icono: "inicio", fin: true },
    { a: "/asesor/solicitudes", texto: "Solicitudes", icono: "lista" },
    { a: "/asesor/renovaciones", texto: "Renovaciones", icono: "renovar" },
  ],
  GERENTE: [
    { a: "/gerencia", texto: "Tablero", icono: "tablero", fin: true },
    { a: "/gerencia/imparcialidad", texto: "Imparcialidad", icono: "balanza" },
  ],
};

export function LayoutInterno({ children }: { children: ReactNode }) {
  const { usuario, salir } = useSesion();
  const navegar = useNavigate();
  const { pathname } = useLocation();
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
                <NavLink to={item.a} end={item.fin}><Icono nombre={item.icono} tamano={18} />{item.texto}</NavLink>
              </li>
            ))}
          </ul>
          {usuario.rol === "ASESOR" ? (
            <div className="menu__accion">
              <NavLink className="boton boton--secundario" to="/solicitud"><Icono nombre="mas" tamano={16} />Nueva solicitud</NavLink>
              <p>Abre el formulario del cliente para diligenciarlo con él.</p>
            </div>
          ) : null}
        </nav>
        <main className="interno__contenido">
          {/* La clave hace que la animación de entrada se repita al cambiar de página. */}
          <div className="pagina" key={pathname}>{children}</div>
        </main>
      </div>
    </>
  );
}
