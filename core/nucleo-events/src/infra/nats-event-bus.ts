import { JSONCodec, type NatsConnection, type Subscription, connect } from 'nats';
import type { EventEnvelope } from '../domain/event.js';

/**
 * Thin typed wrapper over a NATS connection for publish/subscribe of Nébula
 * domain events. JetStream is enabled on the server; durable streams/consumers
 * are layered on per-consumer as they are introduced (e.g. nucleo-search in F1).
 */
export class NatsEventBus {
  private readonly codec = JSONCodec<EventEnvelope<unknown>>();

  private constructor(private readonly nc: NatsConnection) {}

  /** Connect to NATS. `url` e.g. nats://localhost:4222. */
  static async connect(url: string): Promise<NatsEventBus> {
    const nc = await connect({ servers: url });
    return new NatsEventBus(nc);
  }

  /** Publish an event envelope on `subject` and flush. */
  async publish<T>(subject: string, event: EventEnvelope<T>): Promise<void> {
    this.nc.publish(subject, this.codec.encode(event));
    await this.nc.flush();
  }

  /**
   * Subscribe to `subject`; `handler` is invoked per message with the decoded
   * envelope. Returns the Subscription (call `.unsubscribe()` to stop).
   */
  subscribe<T>(
    subject: string,
    handler: (event: EventEnvelope<T>) => void | Promise<void>,
  ): Subscription {
    const sub = this.nc.subscribe(subject);
    void (async () => {
      for await (const msg of sub) {
        await handler(this.codec.decode(msg.data) as EventEnvelope<T>);
      }
    })();
    return sub;
  }

  /** Gracefully drain and close the connection. */
  async close(): Promise<void> {
    await this.nc.drain();
  }
}
