import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseEnv } from './env.js';
import { ConfigError, loadConfig } from './load.js';

const validEnv = {
  POSTGRES_HOST: 'localhost',
  POSTGRES_DB: 'nebula',
  POSTGRES_USER: 'nebula',
  POSTGRES_PASSWORD: 'changeme',
  REDIS_URL: 'redis://localhost:6379',
  NATS_URL: 'nats://localhost:4222',
  OIDC_ISSUER_URL: 'http://localhost:8080/realms/nebula',
  OIDC_CLIENT_ID: 'nebula-apps',
  OIDC_CLIENT_SECRET: 'changeme',
};

describe('loadConfig', () => {
  it('parses a valid env and applies defaults', () => {
    const cfg = loadConfig(BaseEnv, validEnv);
    expect(cfg.NEBULA_ENV).toBe('development');
    expect(cfg.POSTGRES_PORT).toBe(5432);
    expect(cfg.JWT_AUDIENCE).toBe('nebula');
  });

  it('fails loud (ConfigError) on a missing required var', () => {
    const { POSTGRES_PASSWORD, ...incomplete } = validEnv;
    void POSTGRES_PASSWORD;
    expect(() => loadConfig(BaseEnv, incomplete)).toThrow(ConfigError);
    expect(() => loadConfig(BaseEnv, incomplete)).toThrow(/POSTGRES_PASSWORD/);
  });

  it('coerces numeric ports from strings', () => {
    const cfg = loadConfig(BaseEnv, { ...validEnv, POSTGRES_PORT: '6543' });
    expect(cfg.POSTGRES_PORT).toBe(6543);
  });

  it('rejects an invalid enum value', () => {
    const schema = z.object({ MODE: z.enum(['a', 'b']) });
    expect(() => loadConfig(schema, { MODE: 'c' })).toThrow(ConfigError);
  });
});
