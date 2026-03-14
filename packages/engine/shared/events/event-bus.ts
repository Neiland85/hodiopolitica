import type { DomainEvent } from './domain-event'
import { createLogger } from '../logger/logger'

const logger = createLogger('event-bus')

/**
 * Handler function for domain events.
 */
export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>

/**
 * In-process EventBus — synchronous publish/subscribe.
 *
 * Design decisions:
 *   - Synchronous for the monolith (no message broker needed yet)
 *   - Supports multiple handlers per event type
 *   - Logs all published events for observability
 *   - Catches handler errors to prevent cascading failures
 *   - Can be replaced with async (RabbitMQ/Kafka) when moving to microservices
 */
export class EventBus {
  private handlers = new Map<string, EventHandler[]>()
  private history: DomainEvent[] = []
  private readonly maxHistory: number

  constructor(maxHistory = 1000) {
    this.maxHistory = maxHistory
  }

  /**
   * Subscribe a handler to a specific event type.
   * Returns an unsubscribe function.
   */
  subscribe<T = unknown>(eventType: string, handler: EventHandler<T>): () => void {
    const existing = this.handlers.get(eventType) || []
    existing.push(handler as EventHandler)
    this.handlers.set(eventType, existing)

    logger.debug(`Subscribed to "${eventType}"`, { totalHandlers: existing.length })

    return () => {
      const handlers = this.handlers.get(eventType) || []
      const index = handlers.indexOf(handler as EventHandler)
      if (index >= 0) {
        handlers.splice(index, 1)
        logger.debug(`Unsubscribed from "${eventType}"`, { totalHandlers: handlers.length })
      }
    }
  }

  /**
   * Publish an event to all subscribed handlers.
   * Errors in handlers are logged but do not prevent other handlers from executing.
   */
  publish<T>(event: DomainEvent<T>): void {
    // Record in history
    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    logger.info(`Event published: ${event.type}`, {
      eventId: event.id,
      source: event.source,
      correlationId: event.correlationId,
    })

    const handlers = this.handlers.get(event.type) || []

    for (const handler of handlers) {
      try {
        handler(event)
      } catch (err) {
        logger.error(`Handler failed for event "${event.type}"`, {
          eventId: event.id,
          error: (err as Error).message,
        })
      }
    }
  }

  /**
   * Get the event history (for auditing/debugging).
   */
  getHistory(eventType?: string): readonly DomainEvent[] {
    if (eventType) {
      return this.history.filter((e) => e.type === eventType)
    }
    return [...this.history]
  }

  /**
   * Clear all subscriptions and history. Used in tests.
   */
  reset(): void {
    this.handlers.clear()
    this.history = []
  }
}

/**
 * Singleton EventBus instance for the application.
 */
export const eventBus = new EventBus()
