const dos = (n: number) => String(n).padStart(2, "0");

export function fecha(valor: string | Date): string {
  const d = new Date(valor);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fechaHora(valor: string | Date): string {
  const d = new Date(valor);
  return `${fecha(d)} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function pesos(valor: number): string {
  return `$ ${Math.round(valor).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

/** Muestra un número que se está escribiendo con puntos de miles: 1250000 → 1.250.000. */
export function conMiles(texto: string): string {
  const digitos = texto.replace(/\D/g, "");
  return digitos ? Number(digitos).toLocaleString("es-CO", { maximumFractionDigits: 0 }) : "";
}

/** Convierte lo que escribió el usuario en número. Vacío → undefined; con letras → NaN. */
export function aNumero(texto: string): number | undefined {
  const limpio = texto.trim().replace(/[.\s]/g, "");
  if (limpio === "") return undefined;
  return /^\d+$/.test(limpio) ? Number(limpio) : Number.NaN;
}
