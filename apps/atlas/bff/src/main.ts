import 'reflect-metadata';
import { NatsEventBus } from '@nebula/nucleo-events';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { noopPublisher } from './application/events.port.js';
import { loadAtlasEnv } from './config.js';

async function bootstrap(): Promise<void> {
  const env = loadAtlasEnv();

  // Connect the event bus; degrade to a no-op publisher if NATS is unavailable.
  let eventPublisher = noopPublisher;
  try {
    eventPublisher = await NatsEventBus.connect(env.NATS_URL);
  } catch (err) {
    console.warn(`[atlas] NATS unavailable, events disabled: ${(err as Error).message}`);
  }

  const app = await NestFactory.create(AppModule.forRoot({ env, eventPublisher }));
  await app.listen(env.ATLAS_PORT);
  console.log(`[atlas] BFF listening on :${env.ATLAS_PORT}`);
}

void bootstrap();
