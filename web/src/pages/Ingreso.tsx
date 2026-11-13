import { type FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import type { ErrorApi, Errores } from "../api/http";
import logo from "../assets/logo-as4.png";
import { Aviso } from "../components/Aviso";
import { Icono, type NombreIcono } from "../components/Icono";
import { inicioDe, useSesion } from "../sesion/Sesion";
import "../components/Campo.css";
import "../components/Boton.css";
import "./Ingreso.css";

// Lo que la plataforma hace por la agencia, con las cifras del análisis de procesos del informe.
const MENSAJES: { icono: NombreIcono; cifra: string; titulo: string; texto: string }[] = [
  { icono: "comparar", cifra: "8", titulo: "aseguradoras en un solo comparativo", texto: "Ordenado por cobertura y precio. La comisión no interviene." },
  { icono: "reloj", cifra: "91 %", titulo: "menos tiempo operativo del asesor", texto: "La plataforma valida, cotiza y registra; usted asesora." },
  { icono: "poliza", cifra: "1", titulo: "solo formulario SARLAFT", texto: "El cliente escribe sus datos una vez y sirven para todas." },
  { icono: "renovar", cifra: "30 días", titulo: "antes del vencimiento", texto: "La renovación se recotiza sola y llega a su lista de tareas." },
];

// Cuentas de los datos de ejemplo, para entrar rápido durante la demostración.
const CUENTAS = [
  { nombre: "Laura Restrepo", rol: "Asesora comercial", correo: "laura.restrepo@as4.example", clave: "Asesor2026*" },
  { nombre: "Camilo Vargas", rol: "Asesor comercial", correo: "camilo.vargas@as4.example", clave: "Asesor2026*" },
  { nombre: "Marta Lucía Ospina", rol: "Gerencia", correo: "gerencia@as4.example", clave: "Gerencia2026*" },
];

const iniciales = (nombre: string) => nombre.split(" ").slice(0, 2).map((p) => p[0]).join("");

function saludo(): string {
  const hora = new Date().getHours();
  return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

export function Ingreso() {
  const { usuario, cargando, ingresar } = useSesion();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Los mensajes del panel rotan solos; se detienen mientras el cursor está encima.
  useEffect(() => {
    if (pausado || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const turno = window.setInterval(() => setActivo((i) => (i + 1) % MENSAJES.length), 4000);
    return () => window.clearInterval(turno);
  }, [pausado]);

  const siguiente = params.get("siguiente");
  const destino = (rol: "ASESOR" | "GERENTE") =>
    siguiente && siguiente.startsWith(rol === "GERENTE" ? "/gerencia" : "/asesor") ? siguiente : inicioDe({ rol } as never);

  if (!cargando && usuario) return <Navigate to={destino(usuario.rol)} replace />;

  async function entrar(conCorreo: string, conClave: string) {
    setEnviando(true);
    setErrores({});
    setMensaje("");
    try {
      const u = await ingresar(conCorreo, conClave);
      navegar(destino(u.rol), { replace: true });
    } catch (error) {
      const e = error as ErrorApi;
      setErrores(e.errores ?? {});
      if (!e.errores || Object.keys(e.errores).length === 0) setMensaje(e.message);
      setEnviando(false);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    void entrar(correo, clave);
  }

  function usarCuenta(cuenta: (typeof CUENTAS)[number]) {
    setCorreo(cuenta.correo);
    setClave(cuenta.clave);
    void entrar(cuenta.correo, cuenta.clave);
  }

  const m = MENSAJES[activo];

  return (
    <div className="ingreso">
      <section className="ingreso__panel" aria-label="AS4 Compara" onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}>
        <div className="ingreso__fondo" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="ingreso__marca">
          <img src={logo} alt="" width={64} height={64} />
          <div>
            <p className="ingreso__agencia">AS4 SEGUROS LTDA</p>
            <p className="ingreso__producto">AS4 Compara</p>
          </div>
        </div>

        <h2 className="ingreso__lema">Comparar es tarea de la plataforma.{" "}<br />Acompañar al cliente, de las personas.</h2>

        <div className="ingreso__mensaje" key={activo}>
          <span className="ingreso__mensaje-icono"><Icono nombre={m.icono} tamano={26} /></span>
          <p>
            <strong className="ingreso__cifra">{m.cifra}</strong> <span className="ingreso__mensaje-titulo">{m.titulo}</span>
            <span className="ingreso__mensaje-texto">{m.texto}</span>
          </p>
        </div>
        <div className="ingreso__puntos">
          {MENSAJES.map((x, i) => (
            <button key={x.titulo} type="button" className={i === activo ? "ingreso__punto ingreso__punto--activo" : "ingreso__punto"}
              aria-label={`Ver mensaje ${i + 1} de ${MENSAJES.length}`} aria-pressed={i === activo} onClick={() => setActivo(i)} />
          ))}
        </div>

        <p className="ingreso__pie">Prototipo académico · Proyecto Integrador 2 · Los datos y las aseguradoras son de ejemplo.</p>
      </section>

      <main className="ingreso__formulario">
        <div className="ingreso__tarjeta">
          <p className="ingreso__saludo">{saludo()}</p>
          <h1>Ingrese a su espacio de trabajo</h1>
          <p className="texto-secundario">Para asesores y gerencia de AS4 Seguros.</p>

          {mensaje ? <Aviso tipo="error"><p>{mensaje}</p></Aviso> : null}

          <form onSubmit={enviar} noValidate>
            <div className={`campo campo--ancho${errores.correo ? " campo--error" : ""}`}>
              <label htmlFor="correo">Correo</label>
              <input id="correo" name="correo" type="email" autoComplete="username" placeholder="nombre@as4.example" value={correo}
                onChange={(e) => setCorreo(e.target.value)} aria-invalid={errores.correo ? true : undefined}
                aria-describedby={errores.correo ? "correo-error" : undefined} />
              {errores.correo ? <p id="correo-error" className="campo__error">{errores.correo}</p> : null}
            </div>
            <div className={`campo campo--ancho${errores.clave ? " campo--error" : ""}`}>
              <label htmlFor="clave">Contraseña</label>
              <div className="ingreso__clave">
                <input id="clave" name="clave" type={verClave ? "text" : "password"} autoComplete="current-password" value={clave}
                  onChange={(e) => setClave(e.target.value)} aria-invalid={errores.clave ? true : undefined}
                  aria-describedby={errores.clave ? "clave-error" : undefined} />
                <button type="button" className="ingreso__ver" aria-pressed={verClave} onClick={() => setVerClave((v) => !v)}>
                  {verClave ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {errores.clave ? <p id="clave-error" className="campo__error">{errores.clave}</p> : null}
            </div>
            <button type="submit" className="boton boton--principal ingreso__entrar" disabled={enviando}>
              {enviando ? <><span className="girador" aria-hidden="true" />Ingresando…</> : <>Ingresar<Icono nombre="flecha" tamano={18} /></>}
            </button>
          </form>

          <div className="ingreso__demo">
            <p className="ingreso__demo-titulo"><span>Cuentas de demostración</span></p>
            <div className="ingreso__cuentas">
              {CUENTAS.map((c) => (
                <button key={c.correo} type="button" className="ingreso__cuenta" disabled={enviando} onClick={() => usarCuenta(c)}
                  aria-label={`Entrar como ${c.nombre}, ${c.rol}`}>
                  <span className="ingreso__avatar" aria-hidden="true">{iniciales(c.nombre)}</span>
                  <span>
                    <strong>{c.nombre}</strong>
                    <span className="ingreso__cuenta-rol">{c.rol}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="ingreso__cliente">
            <Icono nombre="escudo" tamano={18} /> ¿Necesita un seguro? <Link to="/solicitud">Solicite una cotización</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
