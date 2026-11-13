import { nombreDe } from "../../api/cliente";
import type { Catalogos, Ramo } from "../../api/tipos";
import { pesos } from "../../format/formato";

type Datos = Record<string, unknown>;
type Filas = [string, string][];

const siNo = (v: unknown) => (v ? "Sí" : "No");
const dinero = (v: unknown) => (typeof v === "number" ? pesos(v) : "");

export function datosRiesgo(ramo: Ramo, d: Datos | null, c: Catalogos): Filas {
  if (!d) return [];
  switch (ramo) {
    case "AUTOS":
      return [["Placa", String(d.placa)], ["Modelo", String(d.modelo)], ["Ciudad de circulación", nombreDe(c.ciudades, d.ciudad)], ["Uso", nombreDe(c.usosVehiculo, d.uso)]];
    case "SALUD":
      return [["Edades del grupo", `${(d.edades as number[]).join(", ")} años`], ["Preexistencias", siNo(d.preexistencias)]];
    case "VIDA":
      return [["Edad del asegurado", `${d.edad} años`], ["Ocupación", nombreDe(c.ocupaciones, d.ocupacion)], ["Valor asegurado", dinero(d.valorAsegurado)]];
    case "HOGAR":
      return [["Dirección", String(d.direccion)], ["Tipo de inmueble", nombreDe(c.tiposInmueble, d.tipoInmueble)], ["Valor de los contenidos", dinero(d.valorContenidos)]];
    case "PYMES":
      return [["NIT", String(d.nit)], ["Actividad", nombreDe(c.actividades, d.actividad)], ["Ingresos anuales", dinero(d.ingresosAnuales)], ["Empleados", String(d.numeroEmpleados)]];
  }
}

export function datosSarlaft(s: Datos | null): Filas {
  if (!s) return [];
  return [
    ["Ocupación", String(s.ocupacion)],
    ["Ingresos mensuales", dinero(s.ingresosMensuales)],
    ["Egresos mensuales", dinero(s.egresosMensuales)],
    ["Origen de los fondos", String(s.origenFondos)],
    ["Persona expuesta políticamente", siNo(s.personaExpuestaPoliticamente)],
    ...(s.cargoPep ? [["Cargo público", String(s.cargoPep)] as [string, string]] : []),
    ["Declaración de origen lícito", s.declaraOrigenLicito ? "Firmada" : "Sin firmar"],
  ];
}
