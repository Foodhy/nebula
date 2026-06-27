/**
 * Standard envelope for every Nébula domain event published on NATS.
 * `orgId` is carried for tenant-aware consumers; it originates from the
 * producer's validated JWT context, never from client input.
 */
export interface EventEnvelope<T> {
  /** Dotted event type, e.g. "file.created", "user.created". */
  type: string;
  /** Owning organization (tenant). */
  orgId: string;
  /** ISO-8601 timestamp set by the producer. */
  occurredAt: string;
  /** Event-specific payload. */
  payload: T;
}
