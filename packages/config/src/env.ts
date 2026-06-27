import { z } from 'zod';

/**
 * Base environment schema shared across Nébula services. Mirrors .env.example.
 * Individual services extend this with `.merge()` for their own vars.
 * Secrets are required strings with NO defaults — missing = hard fail.
 */
export const BaseEnv = z.object({
  NEBULA_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  NEBULA_DOMAIN: z.string().min(1).default('localhost'),

  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),

  REDIS_URL: z.string().url(),
  NATS_URL: z.string().min(1),

  OIDC_ISSUER_URL: z.string().url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),

  JWT_AUDIENCE: z.string().min(1).default('nebula'),
});
export type BaseEnv = z.infer<typeof BaseEnv>;
