import { loadConfig } from '@nebula/config';
import { z } from 'zod';

export const HeliosBffEnv = z.object({
  HELIOS_BFF_PORT: z.coerce.number().int().positive().default(4020),
  ATLAS_URL: z.string().url().default('http://localhost:4000'),
  VEGA_STORAGE_URL: z.string().url().default('http://localhost:4010'),
  WEB_ORIGIN: z.string().url().default('http://localhost:3001'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
export type HeliosBffEnv = z.infer<typeof HeliosBffEnv>;

export function loadHeliosBffEnv(source?: Record<string, string | undefined>): HeliosBffEnv {
  return loadConfig(HeliosBffEnv, source);
}

export const ENV = Symbol('HELIOS_BFF_ENV');
