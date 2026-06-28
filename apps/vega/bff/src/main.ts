import 'reflect-metadata';
import { initTracing } from '@nebula/observability';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { loadVegaBffEnv } from './config.js';

async function bootstrap(): Promise<void> {
  initTracing({
    serviceName: 'vega-bff',
    otlpUrl: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  });
  const env = loadVegaBffEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env));
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  await app.listen(env.VEGA_BFF_PORT);
  console.log(`[vega-bff] listening on :${env.VEGA_BFF_PORT}`);
}

void bootstrap();
