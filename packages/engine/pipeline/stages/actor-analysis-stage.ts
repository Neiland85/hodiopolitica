// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { analyzeActors } from "../../actors/actor-analyzer";
import type { ActorRepository } from "../../repositories/actor-repository";
import type { PipelineContext, PipelineStageResult } from "../evaluation-pipeline";

/**
 * Pipeline stage: Actor Analysis
 *
 * Wraps the analyzeActors() pure function as a pipeline stage.
 * Loads actors from the repository and computes influence scores.
 */
export function createActorAnalysisStage(actorRepo: ActorRepository) {
  return (context: PipelineContext): PipelineStageResult => {
    const actorsResult = actorRepo.findByCountry(context.country);

    if (!actorsResult.ok) {
      throw new Error(`Actor analysis failed: ${actorsResult.error.message}`);
    }

    const analysis = analyzeActors(context.policy, actorsResult.value);

    return {
      stageName: "actor_analysis",
      metrics: [], // Actor analysis produces ActorAnalysisResult, not PolicyMetrics
      contextUpdates: { actorAnalysis: analysis },
    };
  };
}
