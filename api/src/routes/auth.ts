import bcrypt from "bcryptjs";
import { Router } from "express";
import { cerrarSesion, iniciarSesion, usuarioActual, usuarioPublico } from "../auth/sesion";
import { prisma } from "../db";
import { ErrorDeNegocio, ErrorValidacion, asincrono } from "../errores";
import { erroresPorCampo } from "../validacion/errores";
import { ingresoSchema } from "../validacion/interno";

export const rutasAuth = Router();

rutasAuth.post("/auth/ingreso", asincrono(async (req, res) => {
  const resultado = ingresoSchema.safeParse(req.body);
  if (!resultado.success) throw new ErrorValidacion(erroresPorCampo(resultado.error));
  const usuario = await prisma.usuario.findUnique({ where: { correo: resultado.data.correo.toLowerCase() } });
  const valida = usuario ? await bcrypt.compare(resultado.data.clave, usuario.claveHash) : false;
  if (!usuario || !valida) throw new ErrorDeNegocio(401, "El correo o la contraseña no son correctos.");
  iniciarSesion(req, res, usuario.id);
  res.json({ usuario: usuarioPublico(usuario) });
}));

rutasAuth.get("/auth/sesion", asincrono(async (req, res) => {
  const usuario = await usuarioActual(req);
  if (!usuario) {
    res.status(401).json({ error: "Sin sesión." });
    return;
  }
  res.json({ usuario: usuarioPublico(usuario) });
}));

rutasAuth.post("/auth/salida", (_req, res) => {
  cerrarSesion(res);
  res.status(204).end();
});
