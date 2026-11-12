// Pesos de la DIAN para el dígito de verificación, aplicados desde el último dígito del NIT.
const PESOS_DIAN = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export function digitoVerificacionNit(numero: string): number {
  const digitos = numero.split("").reverse();
  const suma = digitos.reduce((total, digito, i) => total + Number(digito) * PESOS_DIAN[i], 0);
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

export function nitEsValido(nit: string): boolean {
  const partes = /^(\d{9})-(\d)$/.exec(nit);
  return partes !== null && digitoVerificacionNit(partes[1]) === Number(partes[2]);
}
