import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "";
const parsedDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;
const connectionLimit = parsedDatabaseUrl
  ? Number(parsedDatabaseUrl.searchParams.get("connection_limit") ?? "")
  : Number.NaN;

if (databaseUrl.includes("-pooler.") && !databaseUrl.includes("pgbouncer=true")) {
  console.warn(
    "[prisma] DATABASE_URL uses a pooled Postgres host without pgbouncer=true. This can cause intermittent timeouts and 500 responses."
  );
}

if (
  databaseUrl.includes("-pooler.") &&
  Number.isFinite(connectionLimit) &&
  connectionLimit > 0 &&
  connectionLimit < 10
) {
  console.warn(
    `[prisma] DATABASE_URL limits Prisma to ${connectionLimit} pooled connection(s). Dashboard and booking pages issue parallel queries, so values below 10 can cause P2024 pool timeouts.`
  );
}

export const prisma = new PrismaClient({
  log: ["warn", "error"]
});
