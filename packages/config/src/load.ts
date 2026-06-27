import type { z } from 'zod';

/**
 * Thrown when required configuration is missing or invalid.
 * Fails loud at boot — never silently fall back to defaults for required vars.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Validate a record of env vars against a Zod schema.
 * On failure, throws ConfigError listing every offending key — so a missing
 * required env var stops the process at startup with a clear message.
 */
export function loadConfig<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new ConfigError(`Invalid configuration:\n${issues}`);
  }
  return result.data;
}
