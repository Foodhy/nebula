import { Registry, collectDefaultMetrics } from 'prom-client';

/** Shared Prometheus registry for the process. */
export const registry = new Registry();

let started = false;
/** Begin collecting default Node/process metrics (idempotent). */
export function startDefaultMetrics(serviceName: string): void {
  if (started) return;
  registry.setDefaultLabels({ service: serviceName });
  collectDefaultMetrics({ register: registry });
  started = true;
}
