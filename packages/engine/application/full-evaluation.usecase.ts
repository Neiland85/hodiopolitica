// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { PipelineResult, PipelineStage } from "../pipeline/evaluation-pipeline";
import { createEvaluationPipeline } from "../pipeline/evaluation-pipeline";
import { createActorAnalysisStage } from "../pipeline/stages/actor-analysis-stage";
import { createDomainEvaluationStage } from "../pipeline/stages/domain-evaluation-stage";
import { createEvidenceValidationStage } from "../pipeline/stages/evidence-validation-stage";
import { createJudicialRiskStage } from "../pipeline/stages/judicial-risk-stage";
import { createMediaAnalysisStage } from "../pipeline/stages/media-analysis-stage";
import { createPQIStage } from "../pipeline/stages/pqi-stage";
import { createPublicReactionStage } from "../pipeline/stages/public-reaction-stage";
import { createVoteAnalysisStage } from "../pipeline/stages/vote-analysis-stage";
import type { PolicyDecision } from "../policy/policy-decision";
import type { ActorRepository } from "../repositories/actor-repository";
import type { EconomicContextRepository } from "../repositories/economic-context-repository";
import type { JudicialActionRepository } from "../repositories/judicial-action-repository";
import type { MediaCoverageRepository } from "../repositories/media-coverage-repository";
import type { PublicReactionRepository } from "../repositories/public-reaction-repository";
import type { ResearchReferenceRepository } from "../repositories/research-reference-repository";
import type { VoteRepository } from "../repositories/vote-repository";
import type { DomainError } from "../shared/errors/domain-error";
import { DataSourceError } from "../shared/errors/domain-error";
import { createEvent } from "../shared/events/domain-event";
import { eventBus } from "../shared/events/event-bus";
import type { FullEvaluationCompletedPayload, FullEvaluationFailedPayload } from "../shared/events/pipeline-events";
import { PipelineEventTypes } from "../shared/events/pipeline-events";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { fail, ok } from "../shared/result/result";

const logger = createLogger("usecase.full-evaluation");

/**
 * Available pipeline stage identifiers.
 */
export type PipelineStageName =
  | "domain"
  | "actors"
  | "media"
  | "votes"
  | "judicial"
  | "evidence"
  | "public-reaction"
  | "pqi";

/**
 * Command DTO for full evaluation.
 */
export interface FullEvaluationCommand {
  policy: PolicyDecision;
  country: string;
  /** Which stages to include (default: all available) */
  stages?: PipelineStageName[];
  correlationId?: string;
}

/**
 * Use Case: Full Multi-Layer Evaluation
 *
 * Orchestrates the complete evaluation pipeline:
 *   1. Build pipeline with requested stages
 *   2. Execute pipeline (with graceful degradation)
 *   3. Publish domain event
 *   4. Return Result
 *
 * Pipeline order:
 *   domain → actors → media → votes → judicial → evidence → public-reaction → pqi
 *
 * The domain evaluation stage is always included.
 * Other stages are optional and will gracefully degrade
 * if their data sources are not available.
 */
export class FullEvaluationUseCase {
  constructor(
    private readonly contextRepo: EconomicContextRepository,
    private readonly actorRepo: ActorRepository,
    private readonly mediaRepo: MediaCoverageRepository,
    private readonly voteRepo: VoteRepository,
    private readonly judicialRepo: JudicialActionRepository,
    private readonly researchRepo: ResearchReferenceRepository,
    private readonly reactionRepo: PublicReactionRepository,
  ) {}

  execute(command: FullEvaluationCommand): Result<PipelineResult, DomainError> {
    const start = Date.now();
    const requestedStages = command.stages || [
      "domain",
      "actors",
      "media",
      "votes",
      "judicial",
      "evidence",
      "public-reaction",
      "pqi",
    ];

    logger.info("Starting full evaluation pipeline", {
      policyId: command.policy.id,
      country: command.country,
      stages: requestedStages,
    });

    // Verify minimum: domain evaluation must be possible
    const contextCheck = this.contextRepo.findByCountry(command.country);
    if (!contextCheck.ok) {
      this.publishFailureEvent(command, contextCheck.error);
      return fail(new DataSourceError("economic-context", `Cannot evaluate: ${contextCheck.error.message}`));
    }

    // Build pipeline stages
    const stages: PipelineStage[] = [];

    if (requestedStages.includes("domain")) {
      stages.push(createDomainEvaluationStage(this.contextRepo));
    }

    if (requestedStages.includes("actors")) {
      stages.push(createActorAnalysisStage(this.actorRepo));
    }

    if (requestedStages.includes("media")) {
      stages.push(createMediaAnalysisStage(this.mediaRepo));
    }

    if (requestedStages.includes("votes")) {
      stages.push(createVoteAnalysisStage(this.voteRepo));
    }

    if (requestedStages.includes("judicial")) {
      stages.push(createJudicialRiskStage(this.judicialRepo));
    }

    if (requestedStages.includes("evidence")) {
      stages.push(createEvidenceValidationStage(this.researchRepo));
    }

    if (requestedStages.includes("public-reaction")) {
      stages.push(createPublicReactionStage(this.reactionRepo));
    }

    if (requestedStages.includes("pqi")) {
      stages.push(createPQIStage());
    }

    // Execute pipeline
    const pipeline = createEvaluationPipeline(stages);
    const result = pipeline.execute({
      policy: command.policy,
      country: command.country,
      domainMetrics: [],
    });

    const durationMs = Date.now() - start;

    // Publish success event
    this.publishSuccessEvent(command, result, durationMs);

    logger.info("Full evaluation completed", {
      policyId: command.policy.id,
      stagesExecuted: result.stageResults.map((s) => s.stageName),
      pqiScore: result.pqi?.score,
      durationMs,
    });

    return ok(result);
  }

  private publishSuccessEvent(command: FullEvaluationCommand, result: PipelineResult, durationMs: number): void {
    const payload: FullEvaluationCompletedPayload = {
      policyId: command.policy.id,
      country: command.country,
      stagesExecuted: result.stageResults.map((s) => s.stageName),
      pqiScore: result.pqi?.score ?? 0,
      pqiGrade: result.pqi?.grade ?? "N/A",
      durationMs,
    };

    eventBus.publish(
      createEvent(
        PipelineEventTypes.FullEvaluationCompleted,
        "full-evaluation-usecase",
        payload,
        command.correlationId,
      ),
    );
  }

  private publishFailureEvent(command: FullEvaluationCommand, error: DomainError): void {
    const payload: FullEvaluationFailedPayload = {
      policyId: command.policy.id,
      country: command.country,
      errorCode: error.code,
      errorMessage: error.message,
    };

    eventBus.publish(
      createEvent(PipelineEventTypes.FullEvaluationFailed, "full-evaluation-usecase", payload, command.correlationId),
    );
  }
}
