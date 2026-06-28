import 'reflect-metadata';
import { initTracing } from '@nebula/observability';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { loadLyraBffEnv } from './config.js';
import { setupCollabProxy } from './ws-proxy.js';

async function bootstrap(): Promise<void> {
  initTracing({
    serviceName: 'lyra-bff',
    otlpUrl: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  });
  const env = loadLyraBffEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env));
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  await app.init();

  const server = app.getHttpServer();
  setupCollabProxy(server, env);
  await app.listen(env.LYRA_BFF_PORT);
  console.log(`[lyra-bff] listening on :${env.LYRA_BFF_PORT}`);
}

void bootstrap();
