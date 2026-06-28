import { loadConfig } from '@nebula/config';
import { z } from 'zod';

export const LyraEnv = z.object({
  LYRA_PORT: z.coerce.number().int().positive().default(4030),
  POSTGRES_HOST: z.string().min(1).default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().min(1).default('nebula'),
  NEBULA_APP_DB_USER: z.string().min(1).default('nebula_app'),
  NEBULA_APP_DB_PASSWORD: z.string().min(1),
  KEYCLOAK_BASE_URL: z.string().url().default('http://localhost:8080'),
  KEYCLOAK_REALM: z.string().min(1).default('nebula'),
  OIDC_CLIENT_ID: z.string().min(1).default('nebula-apps'),
  VEGA_STORAGE_URL: z.string().url().default('http://localhost:4010'),
});
export type LyraEnv = z.infer<typeof LyraEnv>;

export function loadLyraEnv(source?: Record<string, string | undefined>): LyraEnv {
  return loadConfig(LyraEnv, source);
}
