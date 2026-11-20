/** Bloques grises animados que ocupan el lugar del contenido mientras carga. */
export function Esqueleto({ filas = 3, alto = 64 }: { filas?: number; alto?: number }) {
  return (
    <div className="esqueleto" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="esqueleto__bloque" style={{ height: alto, animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  );
}
