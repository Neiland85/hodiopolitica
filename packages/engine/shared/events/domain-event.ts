// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

/**
 * Domain Events — decoupled inter-module communication.
 *
 * Events represent facts that have already happened in the domain.
 * Modules publish events; other modules subscribe to react.
 *
 * This enables:
 *   - Module decoupling (publisher doesn't know subscribers)
 *   - Audit trails (all events are timestamped and traceable)
 *   - Future extensibility (new modules just subscribe)
 *
 * @example
 * ```ts
 * eventBus.subscribe('PolicyEvaluated', (event) => {
 *   auditLog.record(event)
 * })
 *
 * eventBus.publish({
 *   type: 'PolicyEvaluated',
 *   payload: { policyId: 'housing-law-2023', metricsCount: 2 },
 * })
 * ```
 */

export interface DomainEvent<T = unknown> {
  /** Unique event identifier */
  readonly id: string;
  /** Event type name (PascalCase by convention) */
  readonly type: string;
  /** When the event occurred */
  readonly timestamp: Date;
  /** The module that emitted the event */
  readonly source: string;
  /** Event-specific data */
  readonly payload: T;
  /** Correlation ID for tracing across event chains */
  readonly correlationId?: string;
}

/** Creates a new domain event with auto-generated id and timestamp. */
export function createEvent<T>(type: string, source: string, payload: T, correlationId?: string): DomainEvent<T> {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date(),
    source,
    payload,
    correlationId,
  };
}

let counter = 0;
function generateEventId(): string {
  counter += 1;
  return `evt_${Date.now()}_${counter}`;
}
