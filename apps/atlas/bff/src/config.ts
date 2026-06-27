import { loadConfig } from '@nebula/config';
import { z } from 'zod';

/** Atlas BFF configuration. Validated at boot; missing required vars fail loud. */
export const AtlasEnv = z.object({
  KEYCLOAK_BASE_URL: z.string().url(),
  KEYCLOAK_REALM: z.string().min(1).default('nebula'),
  OIDC_CLIENT_ID: z.string().min(1).default('nebula-apps'),
  OIDC_CLIENT_SECRET: z.string().min(1),
  ATLAS_PORT: z.coerce.number().int().positive().default(4000),
  NATS_URL: z.string().min(1),
});
export type AtlasEnv = z.infer<typeof AtlasEnv>;

export function loadAtlasEnv(source?: Record<string, string | undefined>): AtlasEnv {
  return loadConfig(AtlasEnv, source);
}
