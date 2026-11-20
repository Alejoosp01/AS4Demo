import "./efectos.css";

const sinMovimiento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Onda que sale del punto donde se pulsa cualquier botón de la aplicación. */
export function activarOndas() {
  document.addEventListener("pointerdown", (e) => {
    const boton = (e.target as HTMLElement | null)?.closest<HTMLElement>(".boton:not(:disabled):not(.boton--enlace)");
    if (!boton || sinMovimiento()) return;
    const caja = boton.getBoundingClientRect();
    const onda = document.createElement("span");
    onda.className = "onda";
    onda.setAttribute("aria-hidden", "true");
    onda.style.left = `${e.clientX - caja.left}px`;
    onda.style.top = `${e.clientY - caja.top}px`;
    boton.appendChild(onda);
    window.setTimeout(() => onda.remove(), 650);
  });
}

const COLORES = ["#1f5fe0", "#4fa3ff", "#e3263b", "#ff8a96", "#0b1f4d", "#ffffff"];

/** Lluvia de confeti azul y rojo para celebrar un logro (póliza emitida, renovación). */
export function celebrar(cantidad = 90) {
  if (sinMovimiento()) return;
  const capa = document.createElement("div");
  capa.className = "confeti no-imprimir";
  capa.setAttribute("aria-hidden", "true");
  for (let i = 0; i < cantidad; i++) {
    const pieza = document.createElement("span");
    const tamano = 6 + Math.random() * 8;
    pieza.style.left = `${Math.random() * 100}%`;
    pieza.style.width = `${tamano}px`;
    pieza.style.height = `${tamano * (Math.random() > 0.5 ? 0.45 : 1)}px`;
    pieza.style.background = COLORES[i % COLORES.length];
    pieza.style.borderRadius = Math.random() > 0.6 ? "50%" : "2px";
    pieza.style.setProperty("--x", `${(Math.random() - 0.5) * 240}px`);
    pieza.style.setProperty("--giro", `${(Math.random() - 0.5) * 1440}deg`);
    pieza.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    pieza.style.animationDelay = `${Math.random() * 0.5}s`;
    capa.appendChild(pieza);
  }
  document.body.appendChild(capa);
  window.setTimeout(() => capa.remove(), 4500);
}
