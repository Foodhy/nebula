import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

export interface TracingOptions {
  serviceName: string;
  /** OTLP HTTP traces endpoint, e.g. http://localhost:4318/v1/traces (Tempo). */
  otlpUrl?: string;
}

/**
 * Initialize OpenTelemetry tracing with auto-instrumentation (HTTP/Express/Nest)
 * and an OTLP exporter to Tempo. Call ONCE, before the app is created, so
 * instrumentation can patch modules. trace_id is propagated automatically.
 * Returns the SDK so the caller can shut it down on exit.
 */
export function initTracing(opts: TracingOptions): NodeSDK {
  // NodeSDK reads OTEL_SERVICE_NAME from env — set it without importing Resource
  // (keeps us resilient across @opentelemetry/resources major versions).
  if (!process.env.OTEL_SERVICE_NAME) process.env.OTEL_SERVICE_NAME = opts.serviceName;

  const url = opts.otlpUrl ?? process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(url ? { url } : {}),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
  return sdk;
}
