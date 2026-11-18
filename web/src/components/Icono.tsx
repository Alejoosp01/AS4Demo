const TRAZOS = {
  inicio: "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M9.5 19.5v-5h5v5",
  lista: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  renovar: "M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4",
  tablero: "M4 20V10M10 20V4M16 20v-7M21 20H3",
  balanza: "M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0L5 8ZM19 8l-2.5 6a3 3 0 0 0 5 0L19 8Z",
  mas: "M12 5v14M5 12h14",
  escudo: "M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6L12 3Z",
  poliza: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  asesoria: "M4 5h16v11H9l-5 4z",
  telefono: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z",
  reloj: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  ok: "m5 12.5 4.5 4.5L19 7.5",
  flecha: "M5 12h14M13 6l6 6-6 6",
  comparar: "M4 6h7M4 12h7M4 18h7M15 5l2 2 3-3M15 11l2 2 3-3M15 17l2 2 3-3",
  campana: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0",
  alerta: "M12 4 2.5 20h19L12 4ZM12 10v4M12 17h.01",
  play: "M7 5v14l12-7z",
  pausa: "M8 5v14M16 5v14",
  cerrar: "M6 6l12 12M18 6 6 18",
  brujula: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15.5 8.5l-2 5-5 2 2-5 5-2Z",
  atras: "M19 12H5M11 6l-6 6 6 6",
  estrella: "M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z",
  edificio: "M4 20h16M6 20V8l6-4 6 4v12M10 20v-4h4v4M9 11h.01M15 11h.01",
  engranaje: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
  usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
} as const;

export type NombreIcono = keyof typeof TRAZOS;

/** Iconos de línea propios, para no depender de una librería. Siempre decorativos. */
export function Icono({ nombre, tamano = 20 }: { nombre: NombreIcono; tamano?: number }) {
  return (
    <svg className="icono" width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
