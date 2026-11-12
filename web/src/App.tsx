import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { TopBar } from "./components/TopBar";
import { Bandeja } from "./pages/asesor/Bandeja";
import { DetalleSolicitud } from "./pages/asesor/DetalleSolicitud";
import { Renovaciones } from "./pages/asesor/Renovaciones";
import { PasoSolicitud } from "./pages/cliente/PasoSolicitud";
import { Solicitud } from "./pages/cliente/Solicitud";
import { Imparcialidad } from "./pages/gerencia/Imparcialidad";
import { Tablero } from "./pages/gerencia/Tablero";
import { Ingreso } from "./pages/Ingreso";
import { ProveedorSesion, RutaProtegida } from "./sesion/Sesion";
import "./pages/cliente/Cliente.css";

function LayoutCliente({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="cliente">{children}</main>
    </>
  );
}

export function App() {
  return (
    <ProveedorSesion>
      <Routes>
        <Route path="/" element={<Navigate to="/ingreso" replace />} />
        <Route path="/ingreso" element={<Ingreso />} />
        <Route path="/solicitud" element={<LayoutCliente><PasoSolicitud /></LayoutCliente>} />
        <Route path="/solicitud/:token" element={<LayoutCliente><Solicitud /></LayoutCliente>} />
        <Route path="/asesor" element={<RutaProtegida rol="ASESOR"><Bandeja /></RutaProtegida>} />
        <Route path="/asesor/solicitudes/:id" element={<RutaProtegida rol="ASESOR"><DetalleSolicitud /></RutaProtegida>} />
        <Route path="/asesor/renovaciones" element={<RutaProtegida rol="ASESOR"><Renovaciones /></RutaProtegida>} />
        <Route path="/gerencia" element={<RutaProtegida rol="GERENTE"><Tablero /></RutaProtegida>} />
        <Route path="/gerencia/imparcialidad" element={<RutaProtegida rol="GERENTE"><Imparcialidad /></RutaProtegida>} />
        <Route path="*" element={<LayoutCliente><h1>Página no encontrada</h1><p><a href="/ingreso">Ir al inicio</a></p></LayoutCliente>} />
      </Routes>
    </ProveedorSesion>
  );
}
