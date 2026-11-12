import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { obtenerCatalogos } from "../../api/cliente";
import type { Catalogos } from "../../api/tipos";
import { Selector } from "../../components/Campo";

const PERIODOS = [
  { codigo: "3", nombre: "Últimos 3 meses" },
  { codigo: "6", nombre: "Últimos 6 meses" },
  { codigo: "12", nombre: "Últimos 12 meses" },
];

export function useFiltrosPeriodo() {
  const [params, setParams] = useSearchParams();
  const meses = params.get("meses") ?? "6";
  const ramo = params.get("ramo") ?? "";
  const cambiar = (clave: string, valor: string) => {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    setParams(nuevos, { replace: true });
  };
  return { meses, ramo, cambiar, consulta: params.toString() };
}

export function useCatalogos() {
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  useEffect(() => {
    obtenerCatalogos().then(setCatalogos).catch(() => undefined);
  }, []);
  return catalogos;
}

export function FiltrosPeriodo({ catalogos }: { catalogos: Catalogos | null }) {
  const { meses, ramo, cambiar } = useFiltrosPeriodo();
  return (
    <div className="filtros">
      <Selector id="periodo" etiqueta="Periodo" vacio={false} opciones={PERIODOS} value={meses} onChange={(e) => cambiar("meses", e.target.value)} />
      <Selector id="ramo" etiqueta="Ramo" vacio="Todos" opciones={catalogos?.ramos ?? []} value={ramo} onChange={(e) => cambiar("ramo", e.target.value)} />
    </div>
  );
}

export const porcentaje = (v: number) => `${v.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
