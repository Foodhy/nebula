import { loadConfig } from '@nebula/config';
import { z } from 'zod';

export const LyraBffEnv = z.object({
  LYRA_BFF_PORT: z.coerce.number().int().positive().default(4012),
  ATLAS_URL: z.string().url().default('http://localhost:4000'),
  LYRA_COLLAB_URL: z.string().url().default('http://localhost:4030'),
  LYRA_COLLAB_WS: z.string().min(1).default('ws://localhost:4030'),
  WEB_ORIGIN: z.string().url().default('http://localhost:3002'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});
export type LyraBffEnv = z.infer<typeof LyraBffEnv>;

export function loadLyraBffEnv(source?: Record<string, string | undefined>): LyraBffEnv {
  return loadConfig(LyraBffEnv, source);
}

export const ENV = Symbol('LYRA_BFF_ENV');
