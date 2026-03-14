# ADR-005: Use Case Layer (Application Services)

## Status
Accepted

## Context
The API routes were directly calling domain functions and repositories, mixing HTTP concerns with business orchestration. This made the logic hard to test independently of Express.

## Decision
Introduce an Application Layer with explicit Use Case classes that orchestrate domain operations.

## Pattern
```
API Route → Use Case → Domain Services + Repository + EventBus → Result
```

Each Use Case:
1. Accepts a typed **Command** (write) or **Query** (read)
2. Orchestrates repository calls and domain logic
3. Publishes domain events for cross-cutting concerns
4. Returns `Result<T, DomainError>` — the API maps it to HTTP status codes

## Examples
- `EvaluatePolicyUseCase` — Command: evaluate + publish events
- `ListCountriesUseCase` — Query: read-only, no events

## Consequences
- **Positive**: Business logic testable without HTTP
- **Positive**: API routes become thin adapters
- **Positive**: Natural place for transaction boundaries (future DB)
- **Positive**: CQRS-lite: commands have side effects, queries don't
- **Negative**: One more layer to navigate
