import { type ReactNode, createContext, useCallback, useContext, useRef, useState } from "react";
import { Icono } from "./Icono";
import "./Avisos.css";

interface AvisoFlotante {
  id: number;
  texto: string;
}

const AvisosContext = createContext<(texto: string) => void>(() => undefined);

const DURACION_MS = 4500;

/** Confirmaciones breves que aparecen abajo a la derecha y se van solas. */
export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<AvisoFlotante[]>([]);
  const siguiente = useRef(1);

  const avisar = useCallback((texto: string) => {
    const id = siguiente.current++;
    setAvisos((lista) => [...lista, { id, texto }]);
    window.setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), DURACION_MS);
  }, []);

  return (
    <AvisosContext.Provider value={avisar}>
      {children}
      <div className="avisos no-imprimir" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className="avisos__aviso">
            <span className="avisos__icono"><Icono nombre="ok" tamano={16} /></span>
            {a.texto}
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  );
}

export const useAviso = () => useContext(AvisosContext);
