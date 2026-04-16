import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().trim().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().trim().optional(),
  SUPPORT_EMAIL: z.string().trim().email().default("support@example.com"),
  APP_NAME: z.string().trim().min(1).default("Cal Clone")
});

export const env = envSchema.parse(process.env);
