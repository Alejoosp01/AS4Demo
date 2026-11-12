import type { Ramo } from "./tipos";

export interface DefinicionCobertura {
  codigo: string;
  nombre: string;
  // Peso con el que el amparo suma al puntaje de cobertura del comparativo.
  peso: number;
  explicacion: string;
}

interface Catalogo {
  nombre: string;
  factor: number;
}

interface Tramo {
  hasta: number;
  factor: number;
}

export function claves<T extends Record<string, unknown>>(objeto: T) {
  return Object.keys(objeto) as [keyof T & string, ...(keyof T & string)[]];
}

export const COBERTURAS: Record<Ramo, DefinicionCobertura[]> = {
  AUTOS: [
    { codigo: "rc_extracontractual", nombre: "Responsabilidad civil extracontractual", peso: 5, explicacion: "Paga los daños que usted cause con el vehículo a otras personas o a sus bienes." },
    { codigo: "perdida_total_danos", nombre: "Pérdida total por daños", peso: 4, explicacion: "Si el vehículo queda destruido o la reparación cuesta más del 75 % de su valor, le pagan el valor asegurado." },
    { codigo: "hurto", nombre: "Hurto total y parcial", peso: 4, explicacion: "Cubre el robo del vehículo completo o de sus partes." },
    { codigo: "perdida_parcial_danos", nombre: "Pérdida parcial por daños", peso: 3, explicacion: "Paga la reparación cuando el daño cuesta menos del 75 % del valor del vehículo." },
    { codigo: "asistencia_viaje", nombre: "Asistencia en viaje", peso: 1, explicacion: "Grúa, carro taller y conductor elegido cuando el vehículo no puede seguir." },
    { codigo: "vehiculo_reemplazo", nombre: "Vehículo de reemplazo", peso: 1, explicacion: "Le prestan un vehículo mientras reparan el suyo por un siniestro cubierto." },
  ],
  SALUD: [
    { codigo: "hospitalizacion", nombre: "Hospitalización y cirugía", peso: 5, explicacion: "Paga la estadía en la clínica, las cirugías y los procedimientos cuando usted queda hospitalizado." },
    { codigo: "urgencias", nombre: "Urgencias", peso: 4, explicacion: "Atención inmediata en clínicas de la red, sin autorización previa." },
    { codigo: "consulta_externa", nombre: "Consulta externa con especialistas", peso: 3, explicacion: "Citas con especialistas sin pasar por médico general." },
    { codigo: "medicamentos", nombre: "Medicamentos ambulatorios", peso: 2, explicacion: "Paga los medicamentos que le formulan cuando no está hospitalizado." },
    { codigo: "maternidad", nombre: "Maternidad", peso: 2, explicacion: "Controles del embarazo, parto y atención del recién nacido." },
    { codigo: "exterior", nombre: "Atención en el exterior", peso: 1, explicacion: "Cubre urgencias médicas cuando usted está de viaje fuera del país." },
  ],
  VIDA: [
    { codigo: "muerte", nombre: "Muerte por cualquier causa", peso: 5, explicacion: "Pagan el valor asegurado a sus beneficiarios si usted fallece, por enfermedad o accidente." },
    { codigo: "incapacidad_total", nombre: "Incapacidad total y permanente", peso: 4, explicacion: "Le pagan el valor asegurado si pierde el 50 % o más de su capacidad para trabajar." },
    { codigo: "enfermedades_graves", nombre: "Enfermedades graves", peso: 3, explicacion: "Le adelantan parte del valor asegurado si le diagnostican cáncer, infarto u otra enfermedad grave." },
    { codigo: "muerte_accidental", nombre: "Indemnización adicional por muerte accidental", peso: 2, explicacion: "Sus beneficiarios reciben un valor adicional si el fallecimiento es por accidente." },
    { codigo: "auxilio_funerario", nombre: "Auxilio funerario", peso: 1, explicacion: "Un pago inmediato para cubrir los gastos del funeral." },
  ],
  HOGAR: [
    { codigo: "incendio", nombre: "Incendio y rayo", peso: 5, explicacion: "Paga los daños del inmueble y sus contenidos causados por fuego o rayo." },
    { codigo: "terremoto", nombre: "Terremoto", peso: 4, explicacion: "Paga los daños causados por temblor, terremoto o erupción volcánica." },
    { codigo: "hurto_contenidos", nombre: "Hurto de contenidos", peso: 3, explicacion: "Cubre el robo de muebles, electrodomésticos y objetos de la vivienda." },
    { codigo: "danos_agua", nombre: "Daños por agua", peso: 2, explicacion: "Paga los daños por rotura de tuberías o filtraciones." },
    { codigo: "rc_familiar", nombre: "Responsabilidad civil familiar", peso: 2, explicacion: "Paga los daños que usted o su familia causen a vecinos o terceros." },
    { codigo: "asistencia_hogar", nombre: "Asistencia domiciliaria", peso: 1, explicacion: "Plomero, electricista o cerrajero en caso de emergencia." },
  ],
  PYMES: [
    { codigo: "incendio", nombre: "Incendio y aliadas", peso: 5, explicacion: "Paga los daños del local, la maquinaria y la mercancía por fuego, explosión o anegación." },
    { codigo: "rc_general", nombre: "Responsabilidad civil general", peso: 4, explicacion: "Paga los daños que la empresa cause a clientes, proveedores o terceros." },
    { codigo: "sustraccion", nombre: "Sustracción con violencia", peso: 3, explicacion: "Cubre el robo de bienes del negocio cuando hay fuerza o violencia." },
    { codigo: "lucro_cesante", nombre: "Lucro cesante", peso: 3, explicacion: "Reconoce las utilidades que la empresa deja de recibir mientras se recupera de un siniestro." },
    { codigo: "equipo_electronico", nombre: "Equipo electrónico", peso: 2, explicacion: "Paga daños de computadores, datáfonos y equipos por fallas eléctricas o accidentes." },
    { codigo: "manejo", nombre: "Manejo global comercial", peso: 2, explicacion: "Cubre pérdidas por fraude o abuso de confianza de los empleados." },
  ],
};

export const CIUDADES = {
  bogota: { nombre: "Bogotá", factor: 1.15 },
  medellin: { nombre: "Medellín", factor: 1.1 },
  cali: { nombre: "Cali", factor: 1.12 },
  barranquilla: { nombre: "Barranquilla", factor: 1.05 },
  cartagena: { nombre: "Cartagena", factor: 1.0 },
  bucaramanga: { nombre: "Bucaramanga", factor: 0.95 },
  pereira: { nombre: "Pereira", factor: 0.92 },
  manizales: { nombre: "Manizales", factor: 0.9 },
} as const satisfies Record<string, Catalogo>;

export const USOS_VEHICULO = {
  particular: { nombre: "Particular", factor: 1 },
  trabajo: { nombre: "Trabajo o comercial", factor: 1.18 },
} as const satisfies Record<string, Catalogo>;

export const TIPOS_INMUEBLE = {
  apartamento: { nombre: "Apartamento", factor: 1 },
  casa: { nombre: "Casa", factor: 1.2 },
} as const satisfies Record<string, Catalogo>;

export const OCUPACIONES = {
  empleado: { nombre: "Empleado de oficina", factor: 1 },
  docente: { nombre: "Docente", factor: 1 },
  independiente: { nombre: "Profesional independiente", factor: 1.05 },
  comerciante: { nombre: "Comerciante", factor: 1.1 },
  pensionado: { nombre: "Pensionado", factor: 1.1 },
  conductor: { nombre: "Conductor", factor: 1.35 },
  construccion: { nombre: "Trabajador de construcción", factor: 1.6 },
} as const satisfies Record<string, Catalogo>;

export const ACTIVIDADES_PYMES = {
  comercio: { nombre: "Comercio al por menor", factor: 1 },
  restaurante: { nombre: "Restaurante", factor: 1.25 },
  consultoria: { nombre: "Servicios profesionales y consultoría", factor: 0.8 },
  confeccion: { nombre: "Taller de confección", factor: 1.15 },
  ferreteria: { nombre: "Ferretería", factor: 1.05 },
  transporte: { nombre: "Transporte de carga", factor: 1.45 },
} as const satisfies Record<string, Catalogo>;

export type CodigoCiudad = keyof typeof CIUDADES;
export type CodigoUso = keyof typeof USOS_VEHICULO;
export type CodigoInmueble = keyof typeof TIPOS_INMUEBLE;
export type CodigoOcupacion = keyof typeof OCUPACIONES;
export type CodigoActividad = keyof typeof ACTIVIDADES_PYMES;

// Antigüedad del vehículo en años: los nuevos valen más y su prima es mayor.
export const ANTIGUEDAD_VEHICULO: Tramo[] = [
  { hasta: 2, factor: 1.25 },
  { hasta: 5, factor: 1.1 },
  { hasta: 10, factor: 1 },
  { hasta: 15, factor: 0.9 },
  { hasta: Infinity, factor: 0.8 },
];

// Factor por cada persona del grupo de salud, según su edad.
export const EDAD_SALUD: Tramo[] = [
  { hasta: 17, factor: 0.55 },
  { hasta: 35, factor: 0.8 },
  { hasta: 50, factor: 1 },
  { hasta: 60, factor: 1.5 },
  { hasta: Infinity, factor: 2.1 },
];

export const EDAD_VIDA: Tramo[] = [
  { hasta: 30, factor: 0.7 },
  { hasta: 40, factor: 1 },
  { hasta: 50, factor: 1.5 },
  { hasta: 60, factor: 2.3 },
  { hasta: Infinity, factor: 3.2 },
];

export const RECARGO_PREEXISTENCIAS = 1.3;

// Valores de referencia de la prima base en los ramos que dependen de un monto.
export const UNIDADES = {
  valorAseguradoVida: 100_000_000,
  contenidosHogar: 50_000_000,
  ingresosPymes: 500_000_000,
};

export interface Restricciones {
  antiguedadMaximaVehiculo?: number;
  usosExcluidos?: CodigoUso[];
  aceptaPreexistencias?: boolean;
  edadMaxima?: number;
  ocupacionesExcluidas?: CodigoOcupacion[];
  empleadosMaximo?: number;
  actividadesExcluidas?: CodigoActividad[];
}

/**
 * Qué significa la prima base en cada ramo:
 * - Autos: prima anual de un vehículo de referencia (factor 1).
 * - Salud: prima anual por persona de 36 a 50 años.
 * - Vida: prima anual por cada $ 100.000.000 asegurados a los 31–40 años.
 * - Hogar: prima anual de un apartamento con $ 50.000.000 en contenidos.
 * - Pymes: prima anual de un comercio sin empleados con $ 500.000.000 de ingresos.
 */
export interface TarifaRamo {
  primaBase: number;
  deducible: string;
  coberturas: string[];
  restricciones?: Restricciones;
}

export interface TarifaAseguradora {
  codigo: string;
  nombre: string;
  ramos: Partial<Record<Ramo, TarifaRamo>>;
}

export const ASEGURADORAS: TarifaAseguradora[] = [
  {
    codigo: "andina",
    nombre: "Aseguradora Andina",
    ramos: {
      AUTOS: {
        primaBase: 2_150_000,
        deducible: "10 % de la pérdida, mínimo 1 SMMLV",
        coberturas: ["rc_extracontractual", "perdida_total_danos", "hurto", "perdida_parcial_danos", "asistencia_viaje"],
      },
      SALUD: {
        primaBase: 2_350_000,
        deducible: "Copago de $ 45.000 por consulta",
        coberturas: ["hospitalizacion", "urgencias", "consulta_externa", "medicamentos"],
      },
      VIDA: {
        primaBase: 610_000,
        deducible: "No aplica",
        coberturas: ["muerte", "incapacidad_total", "auxilio_funerario"],
        restricciones: { edadMaxima: 65 },
      },
      HOGAR: {
        primaBase: 780_000,
        deducible: "5 % de la pérdida, mínimo 1 SMMLV",
        coberturas: ["incendio", "terremoto", "hurto_contenidos", "danos_agua"],
      },
      PYMES: {
        primaBase: 3_900_000,
        deducible: "10 % de la pérdida, mínimo 3 SMMLV",
        coberturas: ["incendio", "rc_general", "sustraccion", "equipo_electronico"],
      },
    },
  },
  {
    codigo: "valle",
    nombre: "Seguros del Valle",
    ramos: {
      AUTOS: {
        primaBase: 2_400_000,
        deducible: "Sin deducible en pérdida total; 10 % en pérdida parcial",
        coberturas: ["rc_extracontractual", "perdida_total_danos", "hurto", "perdida_parcial_danos", "asistencia_viaje", "vehiculo_reemplazo"],
        restricciones: { antiguedadMaximaVehiculo: 15 },
      },
      HOGAR: {
        primaBase: 840_000,
        deducible: "10 % de la pérdida, mínimo 1 SMMLV",
        coberturas: ["incendio", "terremoto", "hurto_contenidos", "danos_agua", "rc_familiar", "asistencia_hogar"],
      },
      PYMES: {
        primaBase: 4_300_000,
        deducible: "10 % de la pérdida, mínimo 2 SMMLV",
        coberturas: ["incendio", "rc_general", "sustraccion", "lucro_cesante", "equipo_electronico", "manejo"],
        restricciones: { actividadesExcluidas: ["transporte"] },
      },
    },
  },
  {
    codigo: "sabana",
    nombre: "Compañía Sabana Seguros",
    ramos: {
      AUTOS: {
        primaBase: 1_950_000,
        deducible: "15 % de la pérdida, mínimo 2 SMMLV",
        coberturas: ["rc_extracontractual", "perdida_total_danos", "hurto"],
      },
      VIDA: {
        primaBase: 560_000,
        deducible: "No aplica",
        coberturas: ["muerte", "incapacidad_total"],
        restricciones: { edadMaxima: 60 },
      },
      HOGAR: {
        primaBase: 690_000,
        deducible: "10 % de la pérdida, mínimo 1 SMMLV",
        coberturas: ["incendio", "terremoto", "hurto_contenidos"],
      },
    },
  },
  {
    codigo: "cordillera",
    nombre: "Seguros Cordillera",
    ramos: {
      SALUD: {
        primaBase: 2_900_000,
        deducible: "Sin copago",
        coberturas: ["hospitalizacion", "urgencias", "consulta_externa", "medicamentos", "maternidad", "exterior"],
        restricciones: { aceptaPreexistencias: false },
      },
      VIDA: {
        primaBase: 720_000,
        deducible: "No aplica",
        coberturas: ["muerte", "incapacidad_total", "enfermedades_graves", "muerte_accidental", "auxilio_funerario"],
      },
    },
  },
  {
    codigo: "litoral",
    nombre: "Aseguradora Litoral",
    ramos: {
      AUTOS: {
        primaBase: 2_250_000,
        deducible: "10 % de la pérdida, mínimo 1 SMMLV",
        coberturas: ["rc_extracontractual", "perdida_total_danos", "hurto", "perdida_parcial_danos", "vehiculo_reemplazo"],
      },
      SALUD: {
        primaBase: 2_500_000,
        deducible: "Copago de $ 60.000 por consulta",
        coberturas: ["hospitalizacion", "urgencias", "consulta_externa", "maternidad"],
      },
      PYMES: {
        primaBase: 3_700_000,
        deducible: "15 % de la pérdida, mínimo 2 SMMLV",
        coberturas: ["incendio", "rc_general", "sustraccion"],
        restricciones: { empleadosMaximo: 50 },
      },
    },
  },
  {
    codigo: "altiplano",
    nombre: "Seguros Altiplano",
    ramos: {
      VIDA: {
        primaBase: 590_000,
        deducible: "No aplica",
        coberturas: ["muerte", "incapacidad_total", "enfermedades_graves", "auxilio_funerario"],
        restricciones: { ocupacionesExcluidas: ["construccion", "conductor"] },
      },
      HOGAR: {
        primaBase: 760_000,
        deducible: "5 % de la pérdida, mínimo 1 SMMLV",
        coberturas: ["incendio", "terremoto", "hurto_contenidos", "rc_familiar", "asistencia_hogar"],
      },
      PYMES: {
        primaBase: 4_100_000,
        deducible: "10 % de la pérdida, mínimo 3 SMMLV",
        coberturas: ["incendio", "rc_general", "sustraccion", "lucro_cesante", "manejo"],
      },
    },
  },
  {
    codigo: "macarena",
    nombre: "Aseguradora Macarena",
    ramos: {
      AUTOS: {
        primaBase: 2_050_000,
        deducible: "10 % de la pérdida, mínimo 1 SMMLV",
        coberturas: ["rc_extracontractual", "perdida_total_danos", "hurto", "perdida_parcial_danos", "asistencia_viaje"],
        restricciones: { usosExcluidos: ["trabajo"] },
      },
      SALUD: {
        primaBase: 2_200_000,
        deducible: "Copago de $ 45.000 por consulta",
        coberturas: ["hospitalizacion", "urgencias", "consulta_externa"],
        restricciones: { edadMaxima: 65 },
      },
    },
  },
  {
    codigo: "guatavita",
    nombre: "Seguros Guatavita",
    ramos: {
      SALUD: {
        primaBase: 2_650_000,
        deducible: "Copago de $ 50.000 por consulta",
        coberturas: ["hospitalizacion", "urgencias", "consulta_externa", "medicamentos", "maternidad"],
      },
      VIDA: {
        primaBase: 650_000,
        deducible: "No aplica",
        coberturas: ["muerte", "incapacidad_total", "enfermedades_graves", "muerte_accidental"],
      },
      HOGAR: {
        primaBase: 810_000,
        deducible: "5 % de la pérdida, mínimo 1 SMMLV",
        coberturas: ["incendio", "terremoto", "hurto_contenidos", "danos_agua", "rc_familiar"],
      },
      PYMES: {
        primaBase: 4_450_000,
        deducible: "10 % de la pérdida, mínimo 2 SMMLV",
        coberturas: ["incendio", "rc_general", "sustraccion", "lucro_cesante", "equipo_electronico"],
      },
    },
  },
];
