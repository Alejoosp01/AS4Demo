import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import type { ErrorApi, Errores } from "../api/http";
import { Aviso } from "../components/Aviso";
import { Boton } from "../components/Boton";
import { Campo } from "../components/Campo";
import { TopBar } from "../components/TopBar";
import { inicioDe, useSesion } from "../sesion/Sesion";

export function Ingreso() {
  const { usuario, cargando, ingresar } = useSesion();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const siguiente = params.get("siguiente");
  const destino = (rol: "ASESOR" | "GERENTE") =>
    siguiente && siguiente.startsWith(rol === "GERENTE" ? "/gerencia" : "/asesor") ? siguiente : inicioDe({ rol } as never);

  if (!cargando && usuario) return <Navigate to={destino(usuario.rol)} replace />;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErrores({});
    setMensaje("");
    try {
      const u = await ingresar(correo, clave);
      navegar(destino(u.rol), { replace: true });
    } catch (error) {
      const e = error as ErrorApi;
      setErrores(e.errores ?? {});
      if (!e.errores || Object.keys(e.errores).length === 0) setMensaje(e.message);
      setEnviando(false);
    }
  }

  return (
    <>
      <TopBar />
      <main className="cliente">
        <h1>Ingreso</h1>
        <p className="texto-secundario">Para asesores y gerencia de AS4 Seguros.</p>
        {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}
        <form onSubmit={enviar} noValidate>
          <Campo id="correo" etiqueta="Correo" type="email" autoComplete="username" value={correo}
            onChange={(e) => setCorreo(e.target.value)} error={errores.correo} />
          <Campo id="clave" etiqueta="Contraseña" type="password" autoComplete="current-password" value={clave}
            onChange={(e) => setClave(e.target.value)} error={errores.clave} />
          <div className="acciones">
            <Boton type="submit" variante="principal" disabled={enviando}>{enviando ? "Ingresando…" : "Ingresar"}</Boton>
          </div>
        </form>
        <p className="texto-secundario" style={{ marginTop: "var(--space-6)" }}>
          ¿Necesita un seguro? <Link to="/solicitud">Solicite una cotización</Link>.
        </p>
      </main>
    </>
  );
}
