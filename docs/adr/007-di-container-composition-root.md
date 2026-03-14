# ADR-007: DI Container & Composition Root

## Status

Accepted

## Context

The application has multiple dependencies (repositories, use cases, event bus) that
need to be wired together. Direct constructor calls scattered across the codebase
create tight coupling and make testing difficult.

## Decision

Implement a lightweight **DI Container** with factory-based lazy singletons and a
single **Composition Root** that wires all dependencies at application startup.

## Design

### Container API

```typescript
container.register(key, factory)  // Register a factory function
container.resolve<T>(key)         // Resolve (lazy, singleton)
container.list()                  // List registered keys
```

### Composition Root (`composition-root.ts`)

Single entry point that registers all dependencies:

```
bootstrapContainer()
  ├── DI.ContextRepo  → FileEconomicContextRepository
  ├── DI.PolicyEngine → PolicyEngine (with evaluators)
  ├── DI.EvaluatePolicy → EvaluatePolicyUseCase
  ├── DI.ListCountries  → ListCountriesUseCase
  └── DI.CompareCountries → CompareCountriesUseCase
```

### Key Decisions

- **No decorators or reflection** — pure factory functions, zero magic
- **Lazy singletons** — instantiated on first `resolve()`, then cached
- **String-based keys** — simple `DI` enum, no complex type registry
- **No auto-wiring** — explicit registration prevents surprises

## Consequences

- **Positive**: All wiring in one place — easy to understand and modify
- **Positive**: Tests can replace any dependency by registering a mock
- **Positive**: No dependency on external DI frameworks (InversifyJS, tsyringe, etc.)
- **Positive**: Zero-overhead — no reflection, no decorators, no metadata
- **Negative**: Must manually register new dependencies
- **Negative**: `resolve<T>()` uses type assertion (`any`) — one unavoidable Biome warning
