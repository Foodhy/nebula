import { loadConfig } from '@nebula/config';
import { z } from 'zod';

export const VegaEnv = z.object({
  VEGA_PORT: z.coerce.number().int().positive().default(4010),

  // Postgres — connect as the non-superuser app role (RLS applies).
  POSTGRES_HOST: z.string().min(1).default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().min(1).default('nebula'),
  NEBULA_APP_DB_USER: z.string().min(1).default('nebula_app'),
  NEBULA_APP_DB_PASSWORD: z.string().min(1),

  // MinIO / S3
  MINIO_ENDPOINT: z.string().url(),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_REGION: z.string().min(1).default('us-east-1'),
  MINIO_KMS_KEY_NAME: z.string().min(1).default('nebula-key'),

  NATS_URL: z.string().min(1),

  // OIDC (Keycloak) for JWT validation
  KEYCLOAK_BASE_URL: z.string().url().default('http://localhost:8080'),
  KEYCLOAK_REALM: z.string().min(1).default('nebula'),
  OIDC_CLIENT_ID: z.string().min(1).default('nebula-apps'),
});
export type VegaEnv = z.infer<typeof VegaEnv>;

export function loadVegaEnv(source?: Record<string, string | undefined>): VegaEnv {
  return loadConfig(VegaEnv, source);
}
