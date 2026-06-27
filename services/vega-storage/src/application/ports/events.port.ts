import type { EventEnvelope } from '@nebula/nucleo-events';

export interface EventPublisher {
  publish<T>(subject: string, event: EventEnvelope<T>): Promise<void>;
}

/** No-op publisher for tests / when NATS is unavailable. */
export const noopPublisher: EventPublisher = {
  publish: () => Promise.resolve(),
};
