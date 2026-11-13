import { createApp } from "./app";
import { prisma } from "./db";
import { programarSeguimiento } from "./servicios/seguimiento";

const port = Number(process.env.PORT ?? 3000);
const server = createApp().listen(port);
// Recordatorios, alertas, cierres y propuestas de renovación (T07 y T15).
programarSeguimiento();

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
