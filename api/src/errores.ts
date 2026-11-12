import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import type { ErroresPorCampo } from "./validacion/errores";

export class ErrorDeNegocio extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errores?: ErroresPorCampo,
  ) {
    super(message);
  }
}

export class ErrorValidacion extends ErrorDeNegocio {
  constructor(errores: ErroresPorCampo) {
    super(400, "Revise los campos marcados.", errores);
  }
}

export function asincrono(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

export const manejarErrores: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ErrorDeNegocio) {
    res.status(error.status).json({ error: error.message, errores: error.errores });
    return;
  }
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: "La solicitud no tiene un formato válido." });
    return;
  }
  process.stderr.write(`${error?.stack ?? String(error)}\n`);
  res.status(500).json({ error: "No se pudo completar la operación. Intente de nuevo." });
};
