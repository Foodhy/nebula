import type { EventEnvelope } from '@nebula/nucleo-events';

/** Minimal publish port so use-cases don't depend on a concrete bus (testable). */
export interface EventPublisher {
  publish<T>(subject: string, event: EventEnvelope<T>): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('NEBULA_EVENT_PUBLISHER');

/** No-op publisher for tests / when the bus is unavailable. */
export const noopPublisher: EventPublisher = {
  publish: () => Promise.resolve(),
};
