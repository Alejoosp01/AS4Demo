import { Rol } from "@prisma/client";
import { Router } from "express";
import { requiereRol, usuarioDe } from "../auth/sesion";
import { RAMOS, type Ramo } from "../cotizacion/tipos";
import { asincrono } from "../errores";
import { bandeja, registrarAsesoria, registrarContacto, renovacionesProximas, resumenAsesor } from "../servicios/asesor";
import { cerrarSiniestro, radicarSiniestro, responderPqr } from "../servicios/casos";
import { decidirRenovacion } from "../servicios/renovaciones";
import { ejecutarSeguimiento } from "../servicios/seguimiento";
import { buscarPorId, vistaInterna } from "../servicios/solicitudes";
import { tablero } from "../servicios/tablero";

export const rutasAsesor = Router();
rutasAsesor.use(requiereRol(Rol.ASESOR));

const id = (valor: string) => Number.parseInt(valor, 10) || 0;

rutasAsesor.get("/resumen", asincrono(async (_req, res) => {
  res.json(await resumenAsesor(usuarioDe(res).id));
}));

// Permite correr a mano el seguimiento automático (recordatorios, alertas, cierres y recotización de renovaciones).
rutasAsesor.post("/seguimiento", asincrono(async (_req, res) => {
  res.json(await ejecutarSeguimiento());
}));

rutasAsesor.get("/solicitudes", asincrono(async (req, res) => {
  res.json(await bandeja(req.query as Record<string, string>, usuarioDe(res).id));
}));

rutasAsesor.get("/solicitudes/:id", asincrono(async (req, res) => {
  res.json(vistaInterna(await buscarPorId(id(req.params.id))));
}));

rutasAsesor.post("/solicitudes/:id/asesoria", asincrono(async (req, res) => {
  res.json(vistaInterna(await registrarAsesoria(id(req.params.id), usuarioDe(res).id, req.body)));
}));

rutasAsesor.post("/solicitudes/:id/contacto", asincrono(async (req, res) => {
  res.json(vistaInterna(await registrarContacto(id(req.params.id), usuarioDe(res).nombre, req.body)));
}));

// La decisión de renovación es del cliente (T16); el asesor la registra cuando la recibe por teléfono.
rutasAsesor.post("/solicitudes/:id/renovacion", asincrono(async (req, res) => {
  await decidirRenovacion(id(req.params.id), req.body, usuarioDe(res).nombre);
  res.json(vistaInterna(await buscarPorId(id(req.params.id))));
}));

rutasAsesor.post("/siniestros/:id/radicacion", asincrono(async (req, res) => {
  res.json(vistaInterna(await buscarPorId(await radicarSiniestro(id(req.params.id), usuarioDe(res).nombre))));
}));

rutasAsesor.post("/siniestros/:id/cierre", asincrono(async (req, res) => {
  res.json(vistaInterna(await buscarPorId(await cerrarSiniestro(id(req.params.id), usuarioDe(res).nombre, req.body))));
}));

rutasAsesor.post("/pqr/:id/respuesta", asincrono(async (req, res) => {
  res.json(vistaInterna(await buscarPorId(await responderPqr(id(req.params.id), usuarioDe(res).nombre, req.body))));
}));

rutasAsesor.get("/renovaciones", asincrono(async (_req, res) => {
  res.json(await renovacionesProximas());
}));

export const rutasGerencia = Router();
rutasGerencia.use(requiereRol(Rol.GERENTE));

rutasGerencia.get("/tablero", asincrono(async (req, res) => {
  const meses = [3, 6, 12].includes(Number(req.query.meses)) ? Number(req.query.meses) : 6;
  const ramo = (RAMOS as readonly string[]).includes(String(req.query.ramo)) ? (req.query.ramo as Ramo) : null;
  res.json(await tablero(meses, ramo));
}));
