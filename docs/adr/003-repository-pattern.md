# ADR-003: Repository Pattern for Data Access

## Status
Accepted

## Context
The engine needs economic data to evaluate policies. Currently from JSON files, but future sources include APIs and databases.

## Decision
Define `EconomicContextRepository` as an interface (port) with `FileEconomicContextRepository` as the concrete implementation (adapter).

## Rationale
- Domain logic depends on the interface, not the file system
- New data sources require only a new implementation class
- Tests can use in-memory implementations without I/O
- Follows Hexagonal Architecture (Ports & Adapters)

## Consequences
- **Positive**: Data source is swappable without touching domain logic
- **Positive**: Repository returns `Result<T, DomainError>` — no exceptions leak
- **Positive**: Easy to test with stubs
- **Negative**: One extra abstraction layer for simple file reads
