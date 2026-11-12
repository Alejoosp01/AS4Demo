import "./Grafica.css";

const COLORES = ["#1b2440", "#2f5f9e", "#8a90a0"];

export interface Serie {
  nombre: string;
  valores: (number | null)[];
}

type Formato = (valor: number) => string;

function escala(maximo: number, enteros: boolean) {
  if (maximo <= 0) return { tope: enteros ? 4 : 1, paso: enteros ? 1 : 0.25 };
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const normal = bruto / potencia;
  let paso = (normal <= 1 ? 1 : normal <= 2 ? 2 : normal <= 5 ? 5 : 10) * potencia;
  if (enteros) paso = Math.max(1, Math.ceil(paso));
  return { tope: Math.ceil(maximo / paso) * paso, paso };
}

function Leyenda({ series }: { series: Serie[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="leyenda" aria-hidden="true">
      {series.map((s, i) => (
        <li key={s.nombre}><span className="leyenda__marca" style={{ background: COLORES[i] }} />{s.nombre}</li>
      ))}
    </ul>
  );
}

function EtiquetaMes({ x, y, texto }: { x: number; y: number; texto: string }) {
  const [mes, anio] = texto.split(" ");
  return (
    <text x={x} y={y} textAnchor="middle" className="grafica__eje">
      <tspan x={x}>{mes}</tspan>
      {anio ? <tspan x={x} dy={12}>{anio}</tspan> : null}
    </text>
  );
}

interface Vertical {
  titulo: string;
  categorias: string[];
  series: Serie[];
  formato?: Formato;
  maximo?: number;
  enteros?: boolean;
}

const W = 560;
const H = 250;
const M = { izq: 42, der: 10, arr: 18, aba: 38 };
const ANCHO = W - M.izq - M.der;
const ALTO = H - M.arr - M.aba;

function Ejes({ tope, paso, formato }: { tope: number; paso: number; formato: Formato }) {
  const marcas = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
  return (
    <>
      {marcas.map((v) => {
        const y = M.arr + ALTO - (v / tope) * ALTO;
        return (
          <g key={v}>
            <line x1={M.izq} x2={W - M.der} y1={y} y2={y} className={v === 0 ? "grafica__base" : "grafica__guia"} />
            <text x={M.izq - 6} y={y + 4} textAnchor="end" className="grafica__eje">{formato(v)}</text>
          </g>
        );
      })}
    </>
  );
}

export function GraficaBarras({ titulo, categorias, series, formato = String, maximo, enteros = true }: Vertical) {
  const mayor = Math.max(0, ...series.flatMap((s) => s.valores.map((v) => v ?? 0)));
  const { tope, paso } = maximo ? { tope: maximo, paso: maximo / 4 } : escala(mayor, enteros);
  const grupo = ANCHO / Math.max(1, categorias.length);
  const barra = Math.min(28, (grupo * 0.72) / series.length);
  return (
    <figure className="grafica">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titulo}>
        <Ejes tope={tope} paso={paso} formato={formato} />
        {categorias.map((c, i) => {
          const inicio = M.izq + grupo * i + (grupo - barra * series.length) / 2;
          return (
            <g key={c}>
              {series.map((s, j) => {
                const v = s.valores[i] ?? 0;
                const alto = (v / tope) * ALTO;
                const x = inicio + j * barra;
                return (
                  <g key={s.nombre}>
                    <rect x={x + 1} y={M.arr + ALTO - alto} width={barra - 2} height={alto} fill={COLORES[j]} />
                    <text x={x + barra / 2} y={M.arr + ALTO - alto - 4} textAnchor="middle" className="grafica__valor">{formato(v)}</text>
                  </g>
                );
              })}
              <EtiquetaMes x={M.izq + grupo * i + grupo / 2} y={H - M.aba + 16} texto={c} />
            </g>
          );
        })}
      </svg>
      <Leyenda series={series} />
    </figure>
  );
}

export function GraficaLineas({ titulo, categorias, series, formato = String, maximo, enteros = true }: Vertical) {
  const mayor = Math.max(0, ...series.flatMap((s) => s.valores.map((v) => v ?? 0)));
  const { tope, paso } = maximo ? { tope: maximo, paso: maximo / 4 } : escala(mayor, enteros);
  const grupo = ANCHO / Math.max(1, categorias.length);
  const x = (i: number) => M.izq + grupo * i + grupo / 2;
  const y = (v: number) => M.arr + ALTO - (v / tope) * ALTO;
  return (
    <figure className="grafica">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titulo}>
        <Ejes tope={tope} paso={paso} formato={formato} />
        {series.map((s, j) => {
          const tramos: string[][] = [[]];
          s.valores.forEach((v, i) => {
            if (v === null) tramos.push([]);
            else tramos[tramos.length - 1].push(`${x(i)},${y(v)}`);
          });
          return (
            <g key={s.nombre}>
              {tramos.filter((t) => t.length > 1).map((t, k) => (
                <polyline key={k} points={t.join(" ")} fill="none" stroke={COLORES[j]} strokeWidth={2} />
              ))}
              {s.valores.map((v, i) => (v === null ? null : (
                <g key={i}>
                  <circle cx={x(i)} cy={y(v)} r={3.5} fill={COLORES[j]} />
                  <text x={x(i)} y={y(v) - 8} textAnchor="middle" className="grafica__valor">{formato(v)}</text>
                </g>
              )))}
            </g>
          );
        })}
        {categorias.map((c, i) => <EtiquetaMes key={c} x={x(i)} y={H - M.aba + 16} texto={c} />)}
      </svg>
      <Leyenda series={series} />
    </figure>
  );
}

interface Horizontal {
  titulo: string;
  categorias: string[];
  valores: number[];
  formato?: Formato;
  maximo?: number;
  umbral?: { valor: number; etiqueta: string };
}

export function GraficaBarrasH({ titulo, categorias, valores, formato = String, maximo, umbral }: Horizontal) {
  const fila = 28;
  const izq = 160;
  const der = 56;
  const arr = umbral ? 22 : 6;
  const alto = arr + categorias.length * fila + 6;
  const tope = maximo ?? escala(Math.max(0, ...valores, umbral?.valor ?? 0), true).tope;
  const ancho = W - izq - der;
  const xUmbral = umbral ? izq + (umbral.valor / tope) * ancho : 0;
  return (
    <figure className="grafica">
      <svg viewBox={`0 0 ${W} ${alto}`} role="img" aria-label={titulo}>
        <line x1={izq} x2={izq} y1={arr - 4} y2={alto - 4} className="grafica__base" />
        {categorias.map((c, i) => {
          const y = arr + i * fila;
          const largo = (valores[i] / tope) * ancho;
          const sobre = umbral ? valores[i] > umbral.valor : false;
          return (
            <g key={c}>
              <text x={izq - 8} y={y + fila / 2 + 4} textAnchor="end" className="grafica__eje grafica__categoria">{c}</text>
              <rect x={izq} y={y + 5} width={Math.max(0, largo)} height={fila - 10} fill={sobre ? COLORES[1] : COLORES[0]} />
              <text x={izq + largo + 6} y={y + fila / 2 + 4} className="grafica__valor">{formato(valores[i])}</text>
            </g>
          );
        })}
        {umbral ? (
          <g>
            <line x1={xUmbral} x2={xUmbral} y1={arr - 4} y2={alto - 4} className="grafica__umbral" />
            <text x={xUmbral} y={arr - 8} textAnchor="middle" className="grafica__eje">{umbral.etiqueta}</text>
          </g>
        ) : null}
      </svg>
    </figure>
  );
}
