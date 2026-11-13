import { useEffect, useState } from "react";

const sinMovimiento = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Lleva un número desde cero hasta su valor en unos instantes, para dar vida a los indicadores. */
export function useConteo(valor: number, duracionMs = 700): number {
  const [actual, setActual] = useState(sinMovimiento() ? valor : 0);

  useEffect(() => {
    if (sinMovimiento() || valor === 0) {
      setActual(valor);
      return;
    }
    let cuadro = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / duracionMs);
      // Desaceleración al final.
      setActual(Math.round(valor * (1 - (1 - avance) ** 3)));
      if (avance < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [valor, duracionMs]);

  return actual;
}
