import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Rol, Usuario } from "@prisma/client";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { prisma } from "../db";

const COOKIE = "as4_sesion";
const DURACION_MS = 8 * 60 * 60 * 1000;
// Sin SESSION_SECRET se usa una clave aleatoria: las sesiones se pierden cuando el servicio se reinicia.
const SECRETO = process.env.SESSION_SECRET || randomBytes(32).toString("hex");

const firmar = (valor: string) => createHmac("sha256", SECRETO).update(valor).digest("base64url");

export function iniciarSesion(req: Request, res: Response, usuarioId: number) {
  const contenido = Buffer.from(JSON.stringify({ u: usuarioId, v: Date.now() + DURACION_MS })).toString("base64url");
  res.cookie(COOKIE, `${contenido}.${firmar(contenido)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    maxAge: DURACION_MS,
    path: "/",
  });
}

export function cerrarSesion(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

function leerCookie(req: Request): string | null {
  for (const parte of (req.headers.cookie ?? "").split(";")) {
    const [nombre, ...valor] = parte.trim().split("=");
    if (nombre === COOKIE) return decodeURIComponent(valor.join("="));
  }
  return null;
}

export function usuarioDeCookie(req: Request): number | null {
  const valor = leerCookie(req);
  if (!valor) return null;
  const [contenido, firma] = valor.split(".");
  if (!contenido || !firma) return null;
  const esperada = Buffer.from(firmar(contenido));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  try {
    const { u, v } = JSON.parse(Buffer.from(contenido, "base64url").toString("utf8"));
    return typeof u === "number" && typeof v === "number" && v > Date.now() ? u : null;
  } catch {
    return null;
  }
}

export async function usuarioActual(req: Request): Promise<Usuario | null> {
  const id = usuarioDeCookie(req);
  return id ? prisma.usuario.findUnique({ where: { id } }) : null;
}

export function requiereRol(...roles: Rol[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    usuarioActual(req)
      .then((usuario) => {
        if (!usuario) {
          res.status(401).json({ error: "Inicie sesión para continuar." });
          return;
        }
        if (!roles.includes(usuario.rol)) {
          res.status(403).json({ error: "No tiene permiso para ver esta sección." });
          return;
        }
        res.locals.usuario = usuario;
        next();
      })
      .catch(next);
  };
}

export const usuarioDe = (res: Response) => res.locals.usuario as Usuario;

export const usuarioPublico = (u: Usuario) => ({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol });
