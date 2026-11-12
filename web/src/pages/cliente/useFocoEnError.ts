import { useEffect } from "react";
import type { Errores } from "../../api/http";

/** Después de un envío con errores, lleva el foco al primer campo marcado. */
export function useFocoEnError(errores: Errores, intento: number) {
  useEffect(() => {
    const primero = Object.keys(errores)[0];
    if (!primero) return;
    const elemento = document.getElementById(primero);
    elemento?.focus();
    elemento?.scrollIntoView({ block: "center" });
  }, [intento]);
}
