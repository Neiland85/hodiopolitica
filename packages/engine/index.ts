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

// ─── Actor Model ────────────────────────────────────────────
export type {
  Actor,
  ActorAttributes,
  ActorType,
  JournalistAttributes,
  JudicialAttributes,
  LegislativeAttributes,
  MediaAttributes,
  PoliticianAttributes,
  PublicAttributes,
  ResearcherAttributes,
} from "./actors/actor";
export { VALID_ACTOR_TYPES } from "./actors/actor";
export { analyzeActors } from "./actors/actor-analyzer";
export type {
  ActorAnalysisResult,
  ActorInfluence,
  ActorStance,
  InfluenceChannel,
  SupportBalance,
} from "./actors/actor-influence";

export type { PolicyEvaluator } from "./analysis/policy-engine";
// ─── Core Domain Functions ──────────────────────────────────
export { evaluatePolicy } from "./analysis/policy-engine";
// ─── Application Layer (Use Cases) ──────────────────────────
export type { AnalyzeActorsCommand } from "./application/analyze-actors.usecase";
export { AnalyzeActorsUseCase } from "./application/analyze-actors.usecase";
export type { AnalyzeMediaCommand, MediaAnalysisResult } from "./application/analyze-media.usecase";
export { AnalyzeMediaUseCase } from "./application/analyze-media.usecase";
export type {
  CompareCountriesCommand,
  ComparisonResult,
  ComparisonSummary,
  CountryComparison,
} from "./application/compare-countries.usecase";
export { CompareCountriesUseCase } from "./application/compare-countries.usecase";
export type { EvaluatedMetric, EvaluatePolicyCommand, EvaluationResult } from "./application/evaluate-policy.usecase";
export { EvaluatePolicyUseCase } from "./application/evaluate-policy.usecase";
export type { FullEvaluationCommand, PipelineStageName } from "./application/full-evaluation.usecase";
export { FullEvaluationUseCase } from "./application/full-evaluation.usecase";
export { ListCountriesUseCase } from "./application/list-countries.usecase";
export type { RunScenariosCommand } from "./application/run-scenarios.usecase";
export { RunScenariosUseCase } from "./application/run-scenarios.usecase";
export type { AppConfig } from "./config/config";
// ─── Configuration ──────────────────────────────────────────
export { getConfig, resetConfig } from "./config/config";
export type { EconomicIndicators, PolicyContext } from "./context/policy-context";
export { loadEconomicContext } from "./datasets/load-economic-context";
// ─── Judicial Risk Model ──────────────────────────────────
export type { JudicialAction, JudicialActionType, JudicialRuling, JudicialStatus } from "./judicial/judicial-action";
export { evaluateJudicialRisk } from "./judicial/judicial-risk-model";
// ─── Media Influence Model ──────────────────────────────────
export type { MediaCoverage, SentimentDistribution } from "./media/media-coverage";
export { evaluateMediaInfluence } from "./media/media-influence-model";
export type { MetricSeverity, MetricThresholds, PolicyMetric } from "./metrics/policy-metric";
export { classifyMetricSeverity } from "./metrics/policy-metric";
export { evaluateEconomyPolicy } from "./models/economy-policy-model";
export { evaluateEducationPolicy } from "./models/education-policy-model";
export { evaluateEnvironmentPolicy } from "./models/environment-policy-model";
export { evaluateHealthcarePolicy } from "./models/healthcare-policy-model";
export { evaluateHousingPolicy } from "./models/housing-policy-model";
// ─── Evaluation Pipeline ───────────────────────────────────
export type {
  PipelineContext,
  PipelineResult,
  PipelineStage,
  PipelineStageResult,
  StageOutput,
} from "./pipeline/evaluation-pipeline";
export { createEvaluationPipeline, EvaluationPipeline } from "./pipeline/evaluation-pipeline";
export type { PolicyQualityIndex, PQIComponent, PQIGrade } from "./pipeline/pqi-calculator";
export { computePQI } from "./pipeline/pqi-calculator";
export { createActorAnalysisStage } from "./pipeline/stages/actor-analysis-stage";
export { createDomainEvaluationStage } from "./pipeline/stages/domain-evaluation-stage";
export { createEvidenceValidationStage } from "./pipeline/stages/evidence-validation-stage";
export { createJudicialRiskStage } from "./pipeline/stages/judicial-risk-stage";
export { createMediaAnalysisStage } from "./pipeline/stages/media-analysis-stage";
export { createPQIStage } from "./pipeline/stages/pqi-stage";
export { createPublicReactionStage } from "./pipeline/stages/public-reaction-stage";
export { createVoteAnalysisStage } from "./pipeline/stages/vote-analysis-stage";
// ─── Domain Entities ────────────────────────────────────────
export type { PolicyDecision, PolicyDomain } from "./policy/policy-decision";
// ─── Public Reaction Model ──────────────────────────────────
export type { PublicReactionTimeSeries, ReactionDataPoint } from "./public-reaction/public-reaction";
export { analyzePublicReaction } from "./public-reaction/public-reaction-model";
// ─── Repositories ───────────────────────────────────────────
export type { ActorRepository } from "./repositories/actor-repository";
export type { EconomicContextRepository } from "./repositories/economic-context-repository";
export { FileActorRepository } from "./repositories/file-actor-repository";
export { FileEconomicContextRepository } from "./repositories/file-economic-context-repository";
export { FileJudicialActionRepository } from "./repositories/file-judicial-action-repository";
export { FileMediaCoverageRepository } from "./repositories/file-media-coverage-repository";
export { FilePublicReactionRepository } from "./repositories/file-public-reaction-repository";
export { FileResearchReferenceRepository } from "./repositories/file-research-reference-repository";
export { FileVoteRepository } from "./repositories/file-vote-repository";
export type { JudicialActionRepository } from "./repositories/judicial-action-repository";
export type { MediaCoverageRepository } from "./repositories/media-coverage-repository";
export type { PublicReactionRepository } from "./repositories/public-reaction-repository";
export type { ResearchReferenceRepository } from "./repositories/research-reference-repository";
export type { VoteRepository } from "./repositories/vote-repository";
export { evaluateEvidenceBase } from "./research/evidence-quality-model";
// ─── Research & Evidence Model ──────────────────────────────
export type { PolicyAlignment, ResearchMethodology, ResearchReference } from "./research/research-reference";
export type { ActorOverride, Scenario, ScenarioAssumptions } from "./scenarios/scenario";
export type { ScenarioComparison, ScenarioResult, SensitivityEntry } from "./scenarios/scenario-engine";
// ─── Scenario Engine ────────────────────────────────────────
export { compareScenarios, generateModifiedContext } from "./scenarios/scenario-engine";
export { bootstrapContainer, DI } from "./shared/container/composition-root";
// ─── Dependency Injection ───────────────────────────────────
export { Container, createContainer } from "./shared/container/container";
export { ActorNotFoundError, InvalidActorDataError } from "./shared/errors/actor-errors";
export {
  DataSourceError,
  DomainError,
  InvalidIndicatorError,
  UnsupportedDomainError,
  ValidationError,
} from "./shared/errors/domain-error";
export type {
  ActorAnalysisCompletedPayload,
  ActorAnalysisFailedPayload,
} from "./shared/events/actor-events";
export { ActorEventTypes } from "./shared/events/actor-events";
// ─── Domain Events ──────────────────────────────────────────
export type { DomainEvent } from "./shared/events/domain-event";
export { createEvent } from "./shared/events/domain-event";
export type { EventHandler } from "./shared/events/event-bus";
export { EventBus, eventBus } from "./shared/events/event-bus";
export type {
  JudicialRiskAnalysisCompletedPayload,
  JudicialRiskAnalysisFailedPayload,
} from "./shared/events/judicial-events";
export { JudicialEventTypes } from "./shared/events/judicial-events";
export type {
  MediaAnalysisCompletedPayload,
  MediaAnalysisFailedPayload,
} from "./shared/events/media-events";
export { MediaEventTypes } from "./shared/events/media-events";
export type {
  FullEvaluationCompletedPayload,
  FullEvaluationFailedPayload,
} from "./shared/events/pipeline-events";
export { PipelineEventTypes } from "./shared/events/pipeline-events";
export type {
  EconomicContextLoadedPayload,
  PolicyEvaluatedPayload,
  PolicyEvaluationFailedPayload,
} from "./shared/events/policy-events";
export { PolicyEventTypes } from "./shared/events/policy-events";
export type {
  PublicReactionAnalysisCompletedPayload,
  PublicReactionAnalysisFailedPayload,
} from "./shared/events/public-reaction-events";
export { PublicReactionEventTypes } from "./shared/events/public-reaction-events";
export type {
  EvidenceValidationCompletedPayload,
  EvidenceValidationFailedPayload,
} from "./shared/events/research-events";
export { ResearchEventTypes } from "./shared/events/research-events";
export type {
  ScenarioAnalysisCompletedPayload,
  ScenarioAnalysisFailedPayload,
} from "./shared/events/scenario-events";
export { ScenarioEventTypes } from "./shared/events/scenario-events";
export type {
  VoteAnalysisCompletedPayload,
  VoteAnalysisFailedPayload,
} from "./shared/events/vote-events";
export { VoteEventTypes } from "./shared/events/vote-events";
export type { LogLevel } from "./shared/logger/logger";
// ─── Observability ──────────────────────────────────────────
export { createLogger, Logger } from "./shared/logger/logger";
// ─── Result & Errors ────────────────────────────────────────
export type { Failure, Result, Success } from "./shared/result/result";
export { fail, flatMap, map, ok } from "./shared/result/result";
export { analyzeVotes } from "./votes/vote-analysis-model";
// ─── Vote Analysis Model ──────────────────────────────────
export type { Amendment, AmendmentStatus, VoteRecord, VoteResult } from "./votes/vote-record";
