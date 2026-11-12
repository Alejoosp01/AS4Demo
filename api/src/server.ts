import { createApp } from "./app";
import { prisma } from "./db";

const port = Number(process.env.PORT ?? 3000);
const server = createApp().listen(port);

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
