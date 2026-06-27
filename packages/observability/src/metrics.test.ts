import { describe, expect, it } from 'vitest';
import { registry, startDefaultMetrics } from './metrics.js';

describe('metrics registry', () => {
  it('collects default metrics with a service label', async () => {
    startDefaultMetrics('test-svc');
    const out = await registry.metrics();
    expect(out).toContain('process_cpu_user_seconds_total');
    expect(out).toContain('service="test-svc"');
  });

  it('startDefaultMetrics is idempotent', () => {
    expect(() => {
      startDefaultMetrics('test-svc');
      startDefaultMetrics('test-svc');
    }).not.toThrow();
  });
});
