import express from "express";
import { prisma } from "./db";
import { manejarErrores } from "./errores";
import { rutasAuth } from "./routes/auth";
import { rutasCliente } from "./routes/cliente";
import { rutasAsesor, rutasGerencia } from "./routes/interno";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ estado: "ok" });
    } catch {
      res.status(503).json({ estado: "sin base de datos" });
    }
  });

  app.use(rutasAuth);
  app.use(rutasCliente);
  app.use("/asesor", rutasAsesor);
  app.use("/gerencia", rutasGerencia);

  app.use((_req, res) => {
    res.status(404).json({ error: "No encontrado." });
  });
  app.use(manejarErrores);

  return app;
}
