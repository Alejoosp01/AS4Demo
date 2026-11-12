import { Rol } from "@prisma/client";
import { Router } from "express";
import { requiereRol, usuarioDe } from "../auth/sesion";
import { RAMOS, type Ramo } from "../cotizacion/tipos";
import { asincrono } from "../errores";
import { bandeja, emitirPoliza, marcarRenovacion, registrarAsesoria, renovacionesProximas } from "../servicios/asesor";
import { buscarPorId, vistaSolicitud } from "../servicios/solicitudes";
import { tablero } from "../servicios/tablero";

export const rutasAsesor = Router();
rutasAsesor.use(requiereRol(Rol.ASESOR));

const id = (valor: string) => Number.parseInt(valor, 10) || 0;

rutasAsesor.get("/solicitudes", asincrono(async (req, res) => {
  res.json(await bandeja(req.query as Record<string, string>, usuarioDe(res).id));
}));

rutasAsesor.get("/solicitudes/:id", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await buscarPorId(id(req.params.id))));
}));

rutasAsesor.post("/solicitudes/:id/asesoria", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await registrarAsesoria(id(req.params.id), usuarioDe(res).id, req.body)));
}));

rutasAsesor.post("/solicitudes/:id/emision", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await emitirPoliza(id(req.params.id), req.body)));
}));

rutasAsesor.get("/renovaciones", asincrono(async (_req, res) => {
  res.json(await renovacionesProximas());
}));

rutasAsesor.post("/polizas/:id/renovacion", asincrono(async (req, res) => {
  await marcarRenovacion(id(req.params.id), req.body);
  res.status(204).end();
}));

export const rutasGerencia = Router();
rutasGerencia.use(requiereRol(Rol.GERENTE));

rutasGerencia.get("/tablero", asincrono(async (req, res) => {
  const meses = [3, 6, 12].includes(Number(req.query.meses)) ? Number(req.query.meses) : 6;
  const ramo = (RAMOS as readonly string[]).includes(String(req.query.ramo)) ? (req.query.ramo as Ramo) : null;
  res.json(await tablero(meses, ramo));
}));
