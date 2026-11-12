import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { type Usuario, ingresar as ingresarApi, salir as salirApi, sesionActual } from "../api/interno";
import { LayoutInterno } from "../components/LayoutInterno";

interface Sesion {
  usuario: Usuario | null;
  cargando: boolean;
  ingresar: (correo: string, clave: string) => Promise<Usuario>;
  salir: () => Promise<void>;
}

const SesionContext = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    sesionActual()
      .then(({ usuario: u }) => setUsuario(u))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  const ingresar = useCallback(async (correo: string, clave: string) => {
    const { usuario: u } = await ingresarApi(correo, clave);
    setUsuario(u);
    return u;
  }, []);

  const salir = useCallback(async () => {
    await salirApi().catch(() => undefined);
    setUsuario(null);
  }, []);

  return <SesionContext.Provider value={{ usuario, cargando, ingresar, salir }}>{children}</SesionContext.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(SesionContext);
  if (!sesion) throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  return sesion;
}

export const inicioDe = (u: Usuario) => (u.rol === "GERENTE" ? "/gerencia" : "/asesor");

export function RutaProtegida({ rol, children }: { rol: Usuario["rol"]; children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();
  if (cargando) return <p className="texto-secundario cargando">Cargando…</p>;
  if (!usuario) {
    return <Navigate to={`/ingreso?siguiente=${encodeURIComponent(ubicacion.pathname + ubicacion.search)}`} replace />;
  }
  if (usuario.rol !== rol) return <Navigate to={inicioDe(usuario)} replace />;
  return <LayoutInterno>{children}</LayoutInterno>;
}
