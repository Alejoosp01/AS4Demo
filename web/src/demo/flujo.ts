import type { NombreIcono } from "../components/Icono";

export type Actor = "CLIENTE" | "PLATAFORMA" | "ASESOR" | "ASEGURADORA" | "GERENCIA";
export type RolDemo = "CLIENTE" | "ASESOR" | "GERENTE";

export const ACTORES: { codigo: Actor; nombre: string; icono: NombreIcono }[] = [
  { codigo: "CLIENTE", nombre: "Cliente", icono: "usuario" },
  { codigo: "PLATAFORMA", nombre: "Plataforma", icono: "engranaje" },
  { codigo: "ASESOR", nombre: "Asesor", icono: "asesoria" },
  { codigo: "ASEGURADORA", nombre: "Aseguradora", icono: "edificio" },
  { codigo: "GERENCIA", nombre: "Gerencia", icono: "tablero" },
];

export interface Etapa {
  numero: number;
  nombre: string;
  tareas: string;
  icono: NombreIcono;
  resumen: string;
  acciones: Partial<Record<Actor, string>>;
  dato: string;
  probar: { rol: RolDemo; texto: string; ruta: string };
}

/** Las siete etapas de la matriz TO-BE (T01–T17) y qué hace cada actor en ellas. */
export const ETAPAS: Etapa[] = [
  {
    numero: 1, nombre: "Recepción y perfilamiento", tareas: "T01–T03", icono: "usuario",
    resumen: "El cliente llega por un enlace, autoriza el tratamiento de datos y la plataforma lo clasifica sola.",
    acciones: {
      CLIENTE: "Diligencia nombre, documento, ciudad y ramo, y autoriza el uso de sus datos.",
      PLATAFORMA: "Clasifica persona natural o jurídica, póliza nueva o renovación, y consulta listas restrictivas (SARLAFT).",
    },
    dato: "El SARLAFT se llena una sola vez y sirve para las 8 aseguradoras.",
    probar: { rol: "CLIENTE", texto: "Crear una solicitud", ruta: "/solicitud" },
  },
  {
    numero: 2, nombre: "Captura y validación", tareas: "T04, T06, T07", icono: "lista",
    resumen: "El formulario del ramo llega precargado. Si falta algo, la plataforma persigue el dato por el asesor.",
    acciones: {
      CLIENTE: "Completa los datos del riesgo (vehículo, inmueble, salud…).",
      PLATAFORMA: "Valida campo a campo; recuerda a las 24 h, alerta al asesor a las 48 h y cierra a los 5 días hábiles.",
      ASESOR: "Solo interviene si el cliente se detiene: llama y registra el contacto.",
    },
    dato: "Antes el asesor transcribía cada formulario a mano en 8 portales distintos.",
    probar: { rol: "CLIENTE", texto: "Llenar los datos del seguro", ruta: "/solicitud" },
  },
  {
    numero: 3, nombre: "Cotización", tareas: "T08", icono: "comparar",
    resumen: "El motor consulta las 8 aseguradoras en paralelo y homologa las ofertas.",
    acciones: {
      PLATAFORMA: "Ordena por puntaje de cobertura y, a igual cobertura, por menor prima. La comisión nunca interviene.",
      ASEGURADORA: "Responde con prima, deducible y amparos (simulado con tarifas fijas).",
    },
    dato: "Si una aseguradora no responde en 8 segundos, queda fuera y las demás siguen.",
    probar: { rol: "CLIENTE", texto: "Ver el comparativo", ruta: "/solicitud" },
  },
  {
    numero: 4, nombre: "Asesoría y decisión", tareas: "T09–T10", icono: "asesoria",
    resumen: "El asesor recomienda con criterio escrito y el cliente acepta, pide ajustes o declina.",
    acciones: {
      ASESOR: "Registra la recomendación con un criterio obligatorio que luego no se puede editar.",
      CLIENTE: "Elige la oferta y firma con un código de confirmación, o declina con un motivo.",
    },
    dato: "El criterio escrito protege la imparcialidad: queda en la bitácora para siempre.",
    probar: { rol: "ASESOR", texto: "Registrar una asesoría", ruta: "/asesor/solicitudes?tarea=asesorar" },
  },
  {
    numero: 5, nombre: "Suscripción, pago y emisión", tareas: "T11–T14", icono: "poliza",
    resumen: "La aseguradora suscribe, el cliente paga y la póliza se emite y entrega sola.",
    acciones: {
      ASEGURADORA: "Aprueba estándar o con condiciones.",
      CLIENTE: "Acepta las condiciones y paga la prima.",
      PLATAFORMA: "Emite, entrega la póliza y registra la venta (CRM simulado).",
    },
    dato: "El asesor no digita nada en esta etapa.",
    probar: { rol: "CLIENTE", texto: "Pagar y recibir la póliza", ruta: "/solicitud" },
  },
  {
    numero: 6, nombre: "Siniestros y PQR", tareas: "T15–T16", icono: "escudo",
    resumen: "El cliente reporta desde su póliza y el asesor acompaña hasta el cierre.",
    acciones: {
      CLIENTE: "Reporta el siniestro con la lista de documentos de su ramo, o radica una PQR.",
      ASESOR: "Radica ante la aseguradora, acompaña y cierra con resultado y valor pagado.",
      ASEGURADORA: "Paga u objeta la reclamación.",
    },
    dato: "Es la tarea de mayor prioridad en Mi trabajo del asesor.",
    probar: { rol: "ASESOR", texto: "Acompañar un siniestro", ruta: "/asesor/solicitudes?tarea=casos" },
  },
  {
    numero: 7, nombre: "Renovación y retroalimentación", tareas: "T15–T17", icono: "renovar",
    resumen: "30 días antes del vencimiento la plataforma recotiza y avisa; todo alimenta el tablero de gerencia.",
    acciones: {
      PLATAFORMA: "Recotiza el mismo riesgo con todas las aseguradoras y envía la propuesta.",
      CLIENTE: "Renueva o no desde su enlace, sin volver a llenar formularios.",
      ASESOR: "Llama si pasan 5 días sin respuesta y registra la decisión.",
      GERENCIA: "Mide renovación, siniestros, PQR, conversión e imparcialidad.",
    },
    dato: "Al entrar, asesor y gerencia ven una ventana emergente con las pólizas por vencer.",
    probar: { rol: "ASESOR", texto: "Ver renovaciones por vencer", ruta: "/asesor/renovaciones" },
  },
];

export interface Mision {
  id: string;
  rol: RolDemo;
  texto: string;
  pista: string;
  ruta?: RegExp;
}

/** Retos de la demo por rol. Los que tienen ruta se cumplen al visitarla; los demás, con la acción. */
export const MISIONES: Mision[] = [
  { id: "c-solicitud", rol: "CLIENTE", texto: "Crear una solicitud", pista: "Use «Llenar con datos de ejemplo» en /solicitud.", ruta: /^\/solicitud\/[^/]+$/ },
  { id: "c-comparativo", rol: "CLIENTE", texto: "Ver el comparativo de aseguradoras", pista: "Complete el formulario del ramo y la plataforma cotiza." },
  { id: "c-firma", rol: "CLIENTE", texto: "Elegir una oferta y firmar con código", pista: "El código se muestra en pantalla (en real llegaría por SMS)." },
  { id: "c-poliza", rol: "CLIENTE", texto: "Pagar y recibir la póliza", pista: "La póliza se emite sin que el asesor digite nada." },
  { id: "c-renovacion", rol: "CLIENTE", texto: "Ver el aviso de vencimiento de una póliza", pista: "Desde Renovaciones del asesor, abra «Ver el enlace del cliente»." },
  { id: "a-trabajo", rol: "ASESOR", texto: "Revisar «Mi trabajo»", pista: "Entre como Laura Restrepo.", ruta: /^\/asesor$/ },
  { id: "a-aviso", rol: "ASESOR", texto: "Ver el aviso de renovaciones por vencer", pista: "Aparece al entrar; la campana lo vuelve a abrir." },
  { id: "a-detalle", rol: "ASESOR", texto: "Abrir el detalle y la bitácora de una solicitud", pista: "Desde Solicitudes, abra cualquiera.", ruta: /^\/asesor\/solicitudes\/\d+$/ },
  { id: "a-asesoria", rol: "ASESOR", texto: "Registrar una asesoría con criterio", pista: "Filtre las solicitudes que esperan asesoría." },
  { id: "a-renovaciones", rol: "ASESOR", texto: "Revisar la lista de renovaciones", pista: "Menú «Renovaciones».", ruta: /^\/asesor\/renovaciones$/ },
  { id: "g-tablero", rol: "GERENTE", texto: "Explorar el tablero de seis variables", pista: "Entre como Marta Lucía Ospina.", ruta: /^\/gerencia$/ },
  { id: "g-aviso", rol: "GERENTE", texto: "Ver el aviso de vencimientos de la cartera", pista: "Aparece al entrar; la campana lo vuelve a abrir." },
  { id: "g-imparcialidad", rol: "GERENTE", texto: "Revisar el control de imparcialidad", pista: "Aseguradora Andina supera el 40 % a propósito.", ruta: /^\/gerencia\/imparcialidad$/ },
  { id: "g-vencimientos", rol: "GERENTE", texto: "Revisar la línea de tiempo de vencimientos", pista: "Menú «Vencimientos».", ruta: /^\/gerencia\/renovaciones$/ },
];

export const NOMBRE_ROL: Record<RolDemo, string> = { CLIENTE: "Cliente", ASESOR: "Asesor", GERENTE: "Gerencia" };

export interface Pantalla {
  titulo: string;
  rol: RolDemo;
  etapa: number;
  explicacion: string;
  pruebe: string[];
}

/** Ayuda contextual de la guía flotante según la ruta actual. */
export function pantallaDe(ruta: string, etapaCliente: number | null): Pantalla | null {
  if (ruta === "/solicitud") {
    return {
      titulo: "Solicitud del cliente", rol: "CLIENTE", etapa: 1,
      explicacion: "Es la puerta de entrada: el cliente llega por un enlace, sin crear cuenta. La plataforma lo clasifica y verifica en listas restrictivas.",
      pruebe: ["Pulse «Llenar con datos de ejemplo» para ir rápido.", "Con NIT solo se permite Pymes y RC: pruebe cambiar el tipo de documento.", "El documento 1000000001 simula una coincidencia en listas restrictivas."],
    };
  }
  if (/^\/solicitud\/[^/]+$/.test(ruta)) {
    const etapa = etapaCliente ?? 2;
    const textos: Record<number, Omit<Pantalla, "rol" | "etapa">> = {
      2: { titulo: "Datos del seguro", explicacion: "Formulario del ramo con los datos ya precargados. Si el cliente abandona, la plataforma le recuerda a las 24 h y alerta al asesor a las 48 h.", pruebe: ["Deje un campo vacío y vea la validación.", "Pulse «Llenar con datos de ejemplo» si está disponible."] },
      3: { titulo: "Comparativo", explicacion: "8 aseguradoras ordenadas por cobertura y, a igual cobertura, por menor prima. La comisión no interviene ni se muestra.", pruebe: ["Abra el detalle de amparos de una oferta.", "Elija una oferta o declare «No me interesa» con un motivo."] },
      4: { titulo: "Aceptación y firma", explicacion: "El cliente firma con un código de confirmación. En producción llegaría por SMS; aquí se muestra en pantalla.", pruebe: ["Copie el código y confirme la aceptación."] },
      5: { titulo: "Suscripción y pago", explicacion: "La aseguradora responde (estándar o con condiciones), el cliente paga y la póliza se emite sola.", pruebe: ["Elija una forma de pago y pague la prima."] },
      7: { titulo: "Póliza, siniestros y renovación", explicacion: "Desde su póliza el cliente reporta siniestros, radica PQR y decide la renovación cuando está por vencer.", pruebe: ["Reporte un siniestro con la lista de documentos de su ramo.", "Si la póliza vence pronto, verá una ventana emergente con la propuesta."] },
    };
    const t = textos[etapa] ?? textos[2];
    return { ...t, rol: "CLIENTE", etapa: etapa === 7 ? 6 : etapa };
  }
  if (ruta === "/asesor") {
    return { titulo: "Mi trabajo", rol: "ASESOR", etapa: 4, explicacion: "Solo aparecen las tareas que el TO-BE deja al asesor, en orden de prioridad: siniestros y PQR, asesorías, clientes detenidos y renovaciones sin respuesta.", pruebe: ["Pulse un indicador para saltar a su bloque.", "Use la campana de arriba para ver las pólizas por vencer."] };
  }
  if (ruta === "/asesor/solicitudes") {
    return { titulo: "Bandeja de solicitudes", rol: "ASESOR", etapa: 4, explicacion: "Todas las solicitudes con su siguiente paso y quién es responsable de darlo.", pruebe: ["Filtre por tarea: «Asesoría» muestra las que esperan su recomendación.", "Busque por nombre o documento."] };
  }
  if (/^\/asesor\/solicitudes\/\d+$/.test(ruta)) {
    return { titulo: "Detalle de la solicitud", rol: "ASESOR", etapa: 4, explicacion: "Recorrido de la solicitud, qué sigue, comparativo y bitácora de cada paso (quién hizo qué y cuándo).", pruebe: ["Registre la asesoría: el criterio es obligatorio y no se puede editar.", "Revise la bitácora al final de la página."] };
  }
  if (ruta === "/asesor/renovaciones") {
    return { titulo: "Renovaciones", rol: "ASESOR", etapa: 7, explicacion: "Pólizas que vencen en 30 días, ya recotizadas. Solo hay que llamar cuando pasan cinco días sin respuesta del cliente.", pruebe: ["Abra «Ver el enlace del cliente» para ver el aviso emergente del cliente.", "Registre una decisión tomada por teléfono."] };
  }
  if (ruta === "/gerencia") {
    return { titulo: "Tablero de gerencia", rol: "GERENTE", etapa: 7, explicacion: "Las seis variables del proceso por ramo y por mes: siniestros, renovación, PQR, motivos de no compra, productos y conversión.", pruebe: ["Cambie el periodo a 12 meses.", "Filtre por un ramo."] };
  }
  if (ruta === "/gerencia/imparcialidad") {
    return { titulo: "Control de imparcialidad", rol: "GERENTE", etapa: 7, explicacion: "Mide la participación de cada aseguradora en las ventas y avisa si una supera el 40 %.", pruebe: ["Observe el aviso por Aseguradora Andina (concentración intencional en los datos de ejemplo)."] };
  }
  if (ruta === "/gerencia/renovaciones") {
    return { titulo: "Vencimientos", rol: "GERENTE", etapa: 7, explicacion: "Cartera por renovarse en 30 días, con línea de tiempo y estado de cada propuesta.", pruebe: ["Pase el cursor por los puntos de la línea de tiempo.", "Filtre las que no tienen respuesta."] };
  }
  return null;
}
