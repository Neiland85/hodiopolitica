# ADR-002: Result Type Over Exceptions

## Status
Accepted

## Context
Domain operations (loading data, evaluating policies) can fail in expected ways. We need a consistent error handling strategy.

## Decision
Use `Result<T, DomainError>` for all operations that can fail, instead of throwing exceptions.

## Rationale
- Forces callers to handle both success and failure paths at compile time
- Makes the error contract explicit in function signatures
- Enables railway-oriented composition with `map` and `flatMap`
- Prevents unhandled exceptions from reaching the API layer

## Implementation
- `ok(value)` creates a success
- `fail(error)` creates a failure
- Pattern match with `if (result.ok) { ... } else { ... }`
- Domain errors extend `DomainError` with a `code` and `message`

## Consequences
- **Positive**: No unhandled exceptions in domain logic
- **Positive**: Clear error taxonomy (4 domain error types)
- **Negative**: Slightly more verbose than try/catch
