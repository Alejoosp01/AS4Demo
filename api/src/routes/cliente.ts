import { Router } from "express";
import { catalogos } from "../catalogos";
import { asincrono } from "../errores";
import { radicarPqr, reportarSiniestro } from "../servicios/casos";
import { decidirRenovacion } from "../servicios/renovaciones";
import {
  buscarPorToken,
  cancelarEleccion,
  confirmarAceptacion,
  crearSolicitud,
  elegirOferta,
  guardarBorrador,
  guardarFormulario,
  guardarSarlaft,
  pagarPrima,
  responderCondiciones,
  registrarNoInteres,
  vistaSolicitud,
} from "../servicios/solicitudes";

export const rutasCliente = Router();

rutasCliente.get("/catalogos", (_req, res) => {
  res.json(catalogos());
});

rutasCliente.post("/solicitudes", asincrono(async (req, res) => {
  const solicitud = await crearSolicitud(req.body);
  res.status(201).json({ token: solicitud.token });
}));

rutasCliente.get("/solicitudes/:token", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await buscarPorToken(req.params.token)));
}));

rutasCliente.put("/solicitudes/:token/sarlaft", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await guardarSarlaft(req.params.token, req.body)));
}));

rutasCliente.put("/solicitudes/:token/borrador", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await guardarBorrador(req.params.token, req.body)));
}));

rutasCliente.put("/solicitudes/:token/formulario", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await guardarFormulario(req.params.token, req.body)));
}));

rutasCliente.post("/solicitudes/:token/eleccion", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await elegirOferta(req.params.token, req.body)));
}));

rutasCliente.delete("/solicitudes/:token/eleccion", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await cancelarEleccion(req.params.token)));
}));

rutasCliente.post("/solicitudes/:token/confirmacion", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await confirmarAceptacion(req.params.token, req.body)));
}));

rutasCliente.post("/solicitudes/:token/no-interes", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await registrarNoInteres(req.params.token, req.body)));
}));

rutasCliente.post("/solicitudes/:token/condiciones", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await responderCondiciones(req.params.token, req.body)));
}));

rutasCliente.post("/solicitudes/:token/pago", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await pagarPrima(req.params.token, req.body)));
}));

rutasCliente.post("/solicitudes/:token/siniestros", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await reportarSiniestro(req.params.token, req.body)));
}));

rutasCliente.post("/solicitudes/:token/pqr", asincrono(async (req, res) => {
  res.json(vistaSolicitud(await radicarPqr(req.params.token, req.body)));
}));

rutasCliente.post("/solicitudes/:token/renovacion", asincrono(async (req, res) => {
  const solicitud = await buscarPorToken(req.params.token);
  await decidirRenovacion(solicitud.id, req.body);
  res.json(vistaSolicitud(await buscarPorToken(req.params.token)));
}));
