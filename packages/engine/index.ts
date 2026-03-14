/**
 * @hodiopolitica/engine
 *
 * Core policy analysis engine for the HodioPolitica platform.
 *
 * Architecture layers:
 *   - Application (Use Cases) — orchestrate domain logic with side effects
 *   - Domain (Models, Entities) — pure business rules
 *   - Infrastructure (Repositories, Container) — DI and data access
 *   - Shared (Result, Errors, Events, Logger) — cross-cutting building blocks
 */

// ─── Domain Entities ────────────────────────────────────────
export type { PolicyDecision, PolicyDomain } from './policy/policy-decision'
export type { PolicyContext, EconomicIndicators } from './context/policy-context'
export type { PolicyMetric, MetricSeverity, MetricThresholds } from './metrics/policy-metric'

// ─── Core Domain Functions ──────────────────────────────────
export { evaluatePolicy } from './analysis/policy-engine'
export type { PolicyEvaluator } from './analysis/policy-engine'
export { evaluateHousingPolicy } from './models/housing-policy-model'
export { evaluateEducationPolicy } from './models/education-policy-model'
export { loadEconomicContext } from './datasets/load-economic-context'
export { classifyMetricSeverity } from './metrics/policy-metric'

// ─── Application Layer (Use Cases) ──────────────────────────
export { EvaluatePolicyUseCase } from './application/evaluate-policy.usecase'
export type { EvaluatePolicyCommand, EvaluationResult, EvaluatedMetric } from './application/evaluate-policy.usecase'
export { ListCountriesUseCase } from './application/list-countries.usecase'
export { CompareCountriesUseCase } from './application/compare-countries.usecase'
export type {
  CompareCountriesCommand,
  ComparisonResult,
  CountryComparison,
  ComparisonSummary,
} from './application/compare-countries.usecase'

// ─── Repositories ───────────────────────────────────────────
export type { EconomicContextRepository } from './repositories/economic-context-repository'
export { FileEconomicContextRepository } from './repositories/file-economic-context-repository'

// ─── Dependency Injection ───────────────────────────────────
export { Container, createContainer } from './shared/container/container'
export { bootstrapContainer, DI } from './shared/container/composition-root'

// ─── Domain Events ──────────────────────────────────────────
export type { DomainEvent } from './shared/events/domain-event'
export { createEvent } from './shared/events/domain-event'
export { EventBus, eventBus } from './shared/events/event-bus'
export type { EventHandler } from './shared/events/event-bus'
export { PolicyEventTypes } from './shared/events/policy-events'
export type {
  PolicyEvaluatedPayload,
  PolicyEvaluationFailedPayload,
  EconomicContextLoadedPayload,
} from './shared/events/policy-events'

// ─── Result & Errors ────────────────────────────────────────
export type { Result, Success, Failure } from './shared/result/result'
export { ok, fail, map, flatMap } from './shared/result/result'
export {
  DomainError,
  InvalidIndicatorError,
  UnsupportedDomainError,
  DataSourceError,
  ValidationError,
} from './shared/errors/domain-error'

// ─── Observability ──────────────────────────────────────────
export { Logger, createLogger } from './shared/logger/logger'
export type { LogLevel } from './shared/logger/logger'

// ─── Configuration ──────────────────────────────────────────
export { getConfig, resetConfig } from './config/config'
export type { AppConfig } from './config/config'
