import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { nombreDe, obtenerCatalogos, obtenerSolicitud } from "../../api/cliente";
import type { Catalogos, SolicitudVista } from "../../api/tipos";
import { Aviso } from "../../components/Aviso";
import { Pasos } from "../../components/Pasos";
import { PasoAceptacion, Constancia } from "./PasoAceptacion";
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
  }, [solicitud?.estado, solicitud?.aceptacion?.ofertaId, modificando]);

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
  if (estado === "ACEPTADA" || estado === "EMITIDA") return <Constancia solicitud={solicitud} catalogos={catalogos} />;
  if (estado === "NO_INTERESADA") {
    return (
      <>
        <Pasos actual={3} />
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
