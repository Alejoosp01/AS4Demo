import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSesion } from "../sesion/Sesion";
import type { RolDemo } from "./flujo";

export const CUENTAS_DEMO: Record<Exclude<RolDemo, "CLIENTE">, { nombre: string; correo: string; clave: string }> = {
  ASESOR: { nombre: "Laura Restrepo", correo: "laura.restrepo@as4.example", clave: "Asesor2026*" },
  GERENTE: { nombre: "Marta Lucía Ospina", correo: "gerencia@as4.example", clave: "Gerencia2026*" },
};

/** Cambia al rol pedido (cerrando la sesión anterior si es otro) y abre la ruta. */
export function useEntrarComo() {
  const { usuario, ingresar, salir } = useSesion();
  const navegar = useNavigate();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  const entrar = useCallback(async (rol: RolDemo, ruta: string) => {
    setError("");
    if (rol === "CLIENTE") { navegar(ruta); return; }
    if (usuario?.rol === rol) { navegar(ruta); return; }
    setOcupado(true);
    try {
      if (usuario) await salir();
      const c = CUENTAS_DEMO[rol];
      await ingresar(c.correo, c.clave);
      navegar(ruta);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }, [usuario, ingresar, salir, navegar]);

  return { entrar, ocupado, error };
}
