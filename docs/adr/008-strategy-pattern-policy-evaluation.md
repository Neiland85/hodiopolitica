# ADR-008: Strategy Pattern for Policy Evaluation

## Status

Accepted

## Context

Different policy domains (housing, education, healthcare) require different
evaluation logic and metrics. Hardcoding domain-specific logic in a single function
creates a growing switch statement that violates the Open/Closed Principle.

## Decision

Apply the **Strategy Pattern** via a `PolicyEngine` that dispatches to
domain-specific evaluator functions registered at startup.

## Design

```
PolicyEngine
  ├── register(domain, evaluatorFn)   # Register domain evaluator
  ├── evaluate(policy, context)       # Dispatch to registered evaluator
  │     ├── "housing"  → HousingPolicyModel.evaluate()
  │     ├── "education" → EducationPolicyModel.evaluate()
  │     └── *unknown*  → generic fallback metric
  └── getSupportedDomains()           # List registered domains
```

### Evaluator Contract

Each domain model implements:

```typescript
(policy: PolicyDecision, context: EconomicContext) => PolicyMetric[]
```

- Pure function: no side effects, no I/O
- Returns an array of `PolicyMetric` with value, severity, and description
- Severity classification is domain-specific (thresholds vary by domain)

### Extensibility

Adding a new domain requires only:
1. Create `models/new-domain-model.ts` with the evaluator function
2. Register it in the Composition Root: `engine.register("new-domain", evaluator)`

No existing code needs modification.

## Consequences

- **Positive**: Open/Closed — new domains without touching existing code
- **Positive**: Each domain model is independently testable
- **Positive**: Unknown domains get a graceful fallback (not an error)
- **Positive**: Domain models are pure functions — trivial to test
- **Negative**: Must remember to register new evaluators in the Composition Root
- **Negative**: No compile-time enforcement that all `PolicyDomain` values have evaluators
