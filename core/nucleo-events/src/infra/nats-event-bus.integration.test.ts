import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EventEnvelope } from '../domain/event.js';
import { NatsEventBus } from './nats-event-bus.js';

let container: StartedTestContainer;
let bus: NatsEventBus;

beforeAll(async () => {
  container = await new GenericContainer('nats:2.10-alpine')
    .withCommand(['-js', '-m', '8222'])
    .withExposedPorts(4222, 8222)
    .withWaitStrategy(Wait.forHttp('/healthz', 8222).forStatusCode(200))
    .start();
  const url = `nats://${container.getHost()}:${container.getMappedPort(4222)}`;
  bus = await NatsEventBus.connect(url);
}, 120_000);

afterAll(async () => {
  await bus?.close();
  await container?.stop();
});

describe('NatsEventBus (integration)', () => {
  it('publishes and receives a typed event envelope', async () => {
    const received = new Promise<EventEnvelope<{ fileId: string }>>((resolve) => {
      bus.subscribe<{ fileId: string }>('file.created', (e) => resolve(e));
    });
    // give the async subscription loop a tick to register
    await new Promise((r) => setTimeout(r, 100));

    const sent: EventEnvelope<{ fileId: string }> = {
      type: 'file.created',
      orgId: '00000000-0000-0000-0000-00000000000a',
      occurredAt: '2026-06-27T00:00:00.000Z',
      payload: { fileId: 'file-123' },
    };
    await bus.publish('file.created', sent);

    const got = await received;
    expect(got).toEqual(sent);
  });
});
