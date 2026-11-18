import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { nombreDe, obtenerCatalogos, obtenerSolicitud } from "../../api/cliente";
import type { Catalogos, SolicitudVista } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Pasos } from "../../components/Pasos";
import { completarMision, informarEtapaCliente } from "../../demo/misiones";
import { celebrar } from "../../efectos";
import { PasoAceptacion } from "./PasoAceptacion";
import { PasoPago } from "./PasoPago";
import { PasoPoliza } from "./PasoPoliza";
import { PasoComparativo } from "./PasoComparativo";
import { PasoFormulario } from "./PasoFormulario";

export function Solicitud() {
  const { token = "" } = useParams();
  const [solicitud, setSolicitud] = useState<SolicitudVista | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [error, setError] = useState("");
  const [modificando, setModificando] = useState(false);

  useEffect(() => {
    Promise.all([obtenerSolicitud(token), obtenerCatalogos()])
      .then(([s, c]) => { setSolicitud(s); setCatalogos(c); })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [solicitud?.estado, solicitud?.aceptacion?.ofertaId, solicitud?.aceptacion?.suscripcion?.condicionesAceptadasEn, modificando]);

  // Informa a la guía de la demo en qué etapa está el cliente y marca las misiones correspondientes.
  const conAceptacion = Boolean(solicitud?.aceptacion && !solicitud.aceptacion.confirmadaEn);
  const etapa = !solicitud ? null
    : solicitud.estado === "NUEVA" || modificando ? 2
    : solicitud.estado === "ACEPTADA" ? 5
    : solicitud.estado === "EMITIDA" ? 7
    : solicitud.estado === "COTIZADA" || solicitud.estado === "ASESORADA" ? (conAceptacion ? 4 : 3)
    : null;
  const etapaAnterior = useRef<number | null>(null);
  useEffect(() => {
    informarEtapaCliente(etapa);
    if (etapa === 3) completarMision("c-comparativo");
    // Firmar y pagar cuentan solo cuando el cliente da el paso en esta visita, no al abrir una póliza existente.
    if (etapa === 5 && etapaAnterior.current === 4) completarMision("c-firma");
    if (etapa === 7 && etapaAnterior.current === 5) { completarMision("c-poliza"); celebrar(); }
    if (etapa !== null) etapaAnterior.current = etapa;
  }, [etapa]);
  useEffect(() => () => informarEtapaCliente(null), []);

  if (error) return <Aviso tipo="error"><p>{error}</p></Aviso>;
  if (!solicitud || !catalogos) return <p className="texto-secundario">Cargando la solicitud…</p>;

  const actualizar = (s: SolicitudVista) => { setSolicitud(s); setModificando(false); };
  const { estado, aceptacion } = solicitud;

  if (estado === "CERRADA") {
    return (
      <>
        <h1>Solicitud cerrada</h1>
        <p className="cliente__intro">
          Cerramos esta solicitud porque pasaron cinco días hábiles sin recibir los datos del seguro. Si todavía le interesa,
          puede <a href="/solicitud">crear una nueva solicitud</a> o comunicarse con la agencia.
        </p>
      </>
    );
  }
  if (estado === "NUEVA" || modificando) {
    return (
      <PasoFormulario solicitud={solicitud} catalogos={catalogos} onGuardada={actualizar}
        onCancelar={modificando ? () => setModificando(false) : undefined} />
    );
  }
  if (estado === "EN_CUMPLIMIENTO") {
    return (
      <>
        <Pasos actual={2} />
        <h1>Solicitud en revisión</h1>
        <p className="cliente__intro">
          Su solicitud requiere una revisión adicional del área de cumplimiento antes de cotizar. La agencia se comunicará con usted.
        </p>
      </>
    );
  }
  if (estado === "ACEPTADA") return <PasoPago solicitud={solicitud} catalogos={catalogos} onActualizada={actualizar} />;
  if (estado === "EMITIDA") return <PasoPoliza solicitud={solicitud} catalogos={catalogos} onActualizada={actualizar} />;
  if (estado === "NO_INTERESADA") {
    return (
      <>
        <Pasos actual={4} />
        <h1>Respuesta registrada</h1>
        <p className="cliente__intro">
          Registramos que no continuará con esta cotización. Motivo: {nombreDe(catalogos.motivosNoInteres, solicitud.noInteres?.motivo).toLowerCase()}.
          Si cambia de opinión, puede comunicarse con la agencia.
        </p>
      </>
    );
  }
  if (aceptacion && !aceptacion.confirmadaEn) {
    return <PasoAceptacion solicitud={solicitud} catalogos={catalogos} onActualizada={actualizar} />;
  }
  return (
    <PasoComparativo solicitud={solicitud} catalogos={catalogos} onActualizada={actualizar}
      onModificar={estado === "COTIZADA" ? () => setModificando(true) : undefined} />
  );
}
