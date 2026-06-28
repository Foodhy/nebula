import { loadConfig } from '@nebula/config';
import { z } from 'zod';

export const VegaBffEnv = z.object({
  VEGA_BFF_PORT: z.coerce.number().int().positive().default(4011),
  ATLAS_URL: z.string().url().default('http://localhost:4000'),
  VEGA_STORAGE_URL: z.string().url().default('http://localhost:4010'),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
export type VegaBffEnv = z.infer<typeof VegaBffEnv>;

export function loadVegaBffEnv(source?: Record<string, string | undefined>): VegaBffEnv {
  return loadConfig(VegaBffEnv, source);
}
