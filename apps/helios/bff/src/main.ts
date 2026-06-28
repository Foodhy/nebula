import 'reflect-metadata';
import { initTracing } from '@nebula/observability';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { loadHeliosBffEnv } from './config.js';

async function bootstrap(): Promise<void> {
  initTracing({
    serviceName: 'helios-bff',
    otlpUrl: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  });
  const env = loadHeliosBffEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env));
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  await app.listen(env.HELIOS_BFF_PORT);
  console.log(`[helios-bff] listening on :${env.HELIOS_BFF_PORT}`);
}

void bootstrap();
