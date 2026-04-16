import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "";

if (databaseUrl.includes("-pooler.") && !databaseUrl.includes("pgbouncer=true")) {
  console.warn(
    "[prisma] DATABASE_URL uses a pooled Postgres host without pgbouncer=true. This can cause intermittent timeouts and 500 responses."
  );
}

export const prisma = new PrismaClient({
  log: ["warn", "error"]
});
