import 'reflect-metadata';
import { NatsEventBus } from '@nebula/nucleo-events';
import { initTracing } from '@nebula/observability';
import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';
import { AppModule } from './app.module.js';
import { type EventPublisher, noopPublisher } from './application/ports/events.port.js';
import { loadVegaEnv } from './config.js';
import { EnvKeyProvider } from './infra/env-key-provider.js';
import { S3ObjectStore } from './infra/s3-object-store.js';

async function bootstrap(): Promise<void> {
  initTracing({
    serviceName: 'vega-storage',
    otlpUrl: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  });

  const env = loadVegaEnv();

  const pool = new Pool({
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    database: env.POSTGRES_DB,
    user: env.NEBULA_APP_DB_USER,
    password: env.NEBULA_APP_DB_PASSWORD,
  });

  const objectStore = new S3ObjectStore({
    endpoint: env.MINIO_ENDPOINT,
    region: env.MINIO_REGION,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    kmsKeyName: env.MINIO_KMS_KEY_NAME,
  });
  const keyProvider = new EnvKeyProvider(env.MINIO_KMS_KEY_NAME);

  let eventPublisher: EventPublisher = noopPublisher;
  try {
    eventPublisher = await NatsEventBus.connect(env.NATS_URL);
  } catch (err) {
    console.warn(`[vega] NATS unavailable, events disabled: ${(err as Error).message}`);
  }

  const app = await NestFactory.create(
    AppModule.forRoot({ env, pool, objectStore, keyProvider, eventPublisher }),
  );
  await app.listen(env.VEGA_PORT);
  console.log(`[vega] storage service listening on :${env.VEGA_PORT}`);
}

void bootstrap();
