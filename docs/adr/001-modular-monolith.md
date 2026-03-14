# ADR-001: Modular Monolith Architecture

## Status
Accepted

## Context
HodioPolitica needs an architecture that supports multiple policy domains (housing, education, healthcare) while keeping operational simplicity for a small team.

## Decision
Adopt a **Modular Monolith** with DDD-inspired bounded contexts, packaged as npm workspaces within a single repository.

## Structure
- `packages/engine` — domain logic (pure, no I/O side effects)
- `packages/contracts` — shared DTOs for API boundaries
- `apps/api` — HTTP layer (Express)
- `apps/web` — presentation layer (Next.js)

## Consequences
- **Positive**: Single deployment, shared types, easy refactoring
- **Positive**: Clear module boundaries enable future microservice extraction
- **Negative**: Must enforce module boundaries through discipline (no runtime enforcement)
- **Negative**: All modules share the same runtime — a crash affects everything
