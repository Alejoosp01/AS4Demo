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

/** «hace 3 horas», «hace 2 días»: para que el asesor vea de un vistazo cuánto lleva esperando algo. */
export function hace(valor: string | Date, ahora = new Date()): string {
  const minutos = Math.max(0, Math.floor((ahora.getTime() - new Date(valor).getTime()) / 60000));
  if (minutos < 60) return minutos <= 1 ? "hace un momento" : `hace ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

/** Variación porcentual entre dos primas, con signo: «+4,2 %». */
export function variacion(antes: number, ahora: number): string {
  if (antes <= 0) return "";
  const pct = ((ahora - antes) / antes) * 100;
  const texto = Math.abs(pct).toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return pct === 0 ? "sin cambio" : `${pct > 0 ? "+" : "−"}${texto} %`;
}
