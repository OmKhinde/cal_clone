import { env } from "./config/env.js";
import { app } from "./app.js";
import { prisma } from "./prisma/client.js";

const server = app.listen(env.PORT, () => {
  console.log(`Cal clone backend listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
