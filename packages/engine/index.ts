// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

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

export type { PolicyEvaluator } from "./analysis/policy-engine";
// ─── Core Domain Functions ──────────────────────────────────
export { evaluatePolicy } from "./analysis/policy-engine";
export type {
  CompareCountriesCommand,
  ComparisonResult,
  ComparisonSummary,
  CountryComparison,
} from "./application/compare-countries.usecase";
export { CompareCountriesUseCase } from "./application/compare-countries.usecase";
export type { EvaluatedMetric, EvaluatePolicyCommand, EvaluationResult } from "./application/evaluate-policy.usecase";
// ─── Application Layer (Use Cases) ──────────────────────────
export { EvaluatePolicyUseCase } from "./application/evaluate-policy.usecase";
export { ListCountriesUseCase } from "./application/list-countries.usecase";
export type { AppConfig } from "./config/config";
// ─── Configuration ──────────────────────────────────────────
export { getConfig, resetConfig } from "./config/config";
export type { EconomicIndicators, PolicyContext } from "./context/policy-context";
export { loadEconomicContext } from "./datasets/load-economic-context";
export type { MetricSeverity, MetricThresholds, PolicyMetric } from "./metrics/policy-metric";
export { classifyMetricSeverity } from "./metrics/policy-metric";
export { evaluateEducationPolicy } from "./models/education-policy-model";
export { evaluateHousingPolicy } from "./models/housing-policy-model";
// ─── Domain Entities ────────────────────────────────────────
export type { PolicyDecision, PolicyDomain } from "./policy/policy-decision";
// ─── Repositories ───────────────────────────────────────────
export type { EconomicContextRepository } from "./repositories/economic-context-repository";
export { FileEconomicContextRepository } from "./repositories/file-economic-context-repository";
export { bootstrapContainer, DI } from "./shared/container/composition-root";
// ─── Dependency Injection ───────────────────────────────────
export { Container, createContainer } from "./shared/container/container";
export {
  DataSourceError,
  DomainError,
  InvalidIndicatorError,
  UnsupportedDomainError,
  ValidationError,
} from "./shared/errors/domain-error";
// ─── Domain Events ──────────────────────────────────────────
export type { DomainEvent } from "./shared/events/domain-event";
export { createEvent } from "./shared/events/domain-event";
export type { EventHandler } from "./shared/events/event-bus";
export { EventBus, eventBus } from "./shared/events/event-bus";
export type {
  EconomicContextLoadedPayload,
  PolicyEvaluatedPayload,
  PolicyEvaluationFailedPayload,
} from "./shared/events/policy-events";
export { PolicyEventTypes } from "./shared/events/policy-events";
export type { LogLevel } from "./shared/logger/logger";
// ─── Observability ──────────────────────────────────────────
export { createLogger, Logger } from "./shared/logger/logger";
// ─── Result & Errors ────────────────────────────────────────
export type { Failure, Result, Success } from "./shared/result/result";
export { fail, flatMap, map, ok } from "./shared/result/result";
