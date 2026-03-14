# ADR-004: Domain Events for Inter-Module Communication

## Status
Accepted

## Context
As the system grows, modules need to react to events from other modules without creating tight coupling (e.g., audit logging, notifications, analytics).

## Decision
Implement an in-process `EventBus` with publish/subscribe semantics. Events are typed domain facts (e.g., `PolicyEvaluated`, `PolicyEvaluationFailed`).

## Design
- **Synchronous** delivery within the monolith process
- Events are **immutable facts** with id, timestamp, source, and payload
- The EventBus catches handler errors to prevent cascading failures
- Event history is retained (bounded) for debugging/auditing
- **CorrelationId** enables tracing across event chains

## Migration Path
When extracting to microservices, replace `EventBus` with a message broker (RabbitMQ/Kafka) — the subscriber code stays the same.

## Consequences
- **Positive**: Modules are decoupled (publisher doesn't know subscribers)
- **Positive**: Natural audit trail via event history
- **Positive**: Easy to add new cross-cutting concerns (analytics, caching)
- **Negative**: Debugging event flows requires log correlation
- **Negative**: Synchronous delivery means slow handlers block the publisher
