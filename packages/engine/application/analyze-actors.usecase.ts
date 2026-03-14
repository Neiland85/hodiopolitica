// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { analyzeActors } from "../actors/actor-analyzer";
import type { ActorAnalysisResult } from "../actors/actor-influence";
import type { PolicyDecision } from "../policy/policy-decision";
import type { ActorRepository } from "../repositories/actor-repository";
import type { DomainError } from "../shared/errors/domain-error";
import type { ActorAnalysisCompletedPayload, ActorAnalysisFailedPayload } from "../shared/events/actor-events";
import { ActorEventTypes } from "../shared/events/actor-events";
import { createEvent } from "../shared/events/domain-event";
import { eventBus } from "../shared/events/event-bus";
import { createLogger } from "../shared/logger/logger";
import type { Result } from "../shared/result/result";
import { ok } from "../shared/result/result";

const logger = createLogger("usecase.analyze-actors");

/**
 * Command DTO for actor analysis.
 */
export interface AnalyzeActorsCommand {
  policy: PolicyDecision;
  country: string;
  correlationId?: string;
}

/**
 * Use Case: Analyze Actor Influence on a Policy
 *
 * Orchestrates the actor analysis workflow:
 *   1. Load actors via repository
 *   2. Run the analyzeActors() pure function
 *   3. Publish domain event (success or failure)
 *   4. Return typed Result
 *
 * Follows the exact same pattern as EvaluatePolicyUseCase.
 */
export class AnalyzeActorsUseCase {
  constructor(private readonly actorRepo: ActorRepository) {}

  execute(command: AnalyzeActorsCommand): Result<ActorAnalysisResult, DomainError> {
    const start = Date.now();

    logger.info("Analyzing actors", {
      policyId: command.policy.id,
      country: command.country,
    });

    // 1. Load actors
    const actorsResult = this.actorRepo.findByCountry(command.country);

    if (!actorsResult.ok) {
      this.publishFailureEvent(command, actorsResult.error);
      return actorsResult;
    }

    const actors = actorsResult.value;

    // 2. Analyze
    const analysis: ActorAnalysisResult = analyzeActors(command.policy, actors);

    const durationMs = Date.now() - start;

    // 3. Publish success event
    this.publishSuccessEvent(command, analysis, durationMs);

    logger.info("Actor analysis completed", {
      policyId: command.policy.id,
      actorsAnalyzed: actors.length,
      alignmentScore: analysis.alignmentScore,
      durationMs,
    });

    return ok(analysis);
  }

  private publishSuccessEvent(command: AnalyzeActorsCommand, result: ActorAnalysisResult, durationMs: number): void {
    const payload: ActorAnalysisCompletedPayload = {
      policyId: command.policy.id,
      country: command.country,
      actorsAnalyzed: result.influences.length,
      alignmentScore: result.alignmentScore,
      supportBalance: result.supportBalance,
      durationMs,
    };

    eventBus.publish(
      createEvent(ActorEventTypes.ActorAnalysisCompleted, "analyze-actors-usecase", payload, command.correlationId),
    );
  }

  private publishFailureEvent(command: AnalyzeActorsCommand, error: DomainError): void {
    const payload: ActorAnalysisFailedPayload = {
      policyId: command.policy.id,
      country: command.country,
      errorCode: error.code,
      errorMessage: error.message,
    };

    eventBus.publish(
      createEvent(ActorEventTypes.ActorAnalysisFailed, "analyze-actors-usecase", payload, command.correlationId),
    );
  }
}
