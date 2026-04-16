import { prisma } from "../prisma/client.js";
import { AppError } from "../utils/appError.js";
import {
  DEFAULT_USER_EMAIL,
  DEFAULT_USER_NAME,
  DEFAULT_USER_TIMEZONE,
  DEFAULT_USER_USERNAME,
  type PrismaExecutor
} from "../types/index.js";

type DefaultUserRecord = {
  id: number;
  email: string;
  name: string;
  username: string;
  timezone: string;
};

let cachedDefaultUser: DefaultUserRecord | null = null;
let defaultUserPromise: Promise<DefaultUserRecord> | null = null;

function isPrismaErrorCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function fetchOrCreateDefaultUser(db: PrismaExecutor) {
  const user = await db.user.findUnique({
    where: { email: DEFAULT_USER_EMAIL }
  });

  if (user) {
    return user;
  }

  try {
    return await db.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        name: DEFAULT_USER_NAME,
        username: DEFAULT_USER_USERNAME,
        timezone: DEFAULT_USER_TIMEZONE
      }
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      const existing = await db.user.findUnique({
        where: { email: DEFAULT_USER_EMAIL }
      });

      if (existing) {
        return existing;
      }
    }

    throw new AppError(
      "DEFAULT_USER_NOT_SEEDED",
      "Default user could not be created. Check the database connection and retry.",
      500
    );
  }
}

export async function getDefaultUser(db: PrismaExecutor = prisma) {
  if (db !== prisma) {
    return fetchOrCreateDefaultUser(db);
  }

  if (cachedDefaultUser) {
    return cachedDefaultUser;
  }

  if (defaultUserPromise) {
    return defaultUserPromise;
  }

  defaultUserPromise = fetchOrCreateDefaultUser(prisma)
    .then((user) => {
      cachedDefaultUser = user;
      return user;
    })
    .finally(() => {
      defaultUserPromise = null;
    });

  return defaultUserPromise;
}

export function syncDefaultUserCache(user: DefaultUserRecord) {
  cachedDefaultUser = user;
}
