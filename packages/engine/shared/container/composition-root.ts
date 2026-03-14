// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { AnalyzeActorsUseCase } from "../../application/analyze-actors.usecase";
import { AnalyzeMediaUseCase } from "../../application/analyze-media.usecase";
import { CompareCountriesUseCase } from "../../application/compare-countries.usecase";
import { EvaluatePolicyUseCase } from "../../application/evaluate-policy.usecase";
import { FullEvaluationUseCase } from "../../application/full-evaluation.usecase";
import { ListCountriesUseCase } from "../../application/list-countries.usecase";
import { RunScenariosUseCase } from "../../application/run-scenarios.usecase";
import type { ActorRepository } from "../../repositories/actor-repository";
import type { EconomicContextRepository } from "../../repositories/economic-context-repository";
import { FileActorRepository } from "../../repositories/file-actor-repository";
import { FileEconomicContextRepository } from "../../repositories/file-economic-context-repository";
import { FileJudicialActionRepository } from "../../repositories/file-judicial-action-repository";
import { FileMediaCoverageRepository } from "../../repositories/file-media-coverage-repository";
import { FilePublicReactionRepository } from "../../repositories/file-public-reaction-repository";
import { FileResearchReferenceRepository } from "../../repositories/file-research-reference-repository";
import { FileVoteRepository } from "../../repositories/file-vote-repository";
import type { JudicialActionRepository } from "../../repositories/judicial-action-repository";
import type { MediaCoverageRepository } from "../../repositories/media-coverage-repository";
import type { PublicReactionRepository } from "../../repositories/public-reaction-repository";
import type { ResearchReferenceRepository } from "../../repositories/research-reference-repository";
import type { VoteRepository } from "../../repositories/vote-repository";
import { type Container, createContainer } from "./container";

/**
 * Composition Root — the single place where all dependencies are wired.
 *
 * This is the ONLY file that knows about concrete implementations.
 * All other code depends only on interfaces (ports).
 *
 * To swap an implementation (e.g., database instead of file):
 *   1. Create a new class implementing EconomicContextRepository
 *   2. Change the factory here
 *   3. Nothing else changes
 */

/** Dependency names — typed keys for the container. */
export const DI = {
  ContextRepo: "contextRepo",
  ActorRepo: "actorRepo",
  MediaCoverageRepo: "mediaCoverageRepo",
  VoteRepo: "voteRepo",
  JudicialRepo: "judicialRepo",
  ResearchRepo: "researchRepo",
  PublicReactionRepo: "publicReactionRepo",
  EvaluatePolicy: "evaluatePolicy",
  ListCountries: "listCountries",
  CompareCountries: "compareCountries",
  AnalyzeActors: "analyzeActors",
  AnalyzeMedia: "analyzeMedia",
  FullEvaluation: "fullEvaluation",
  RunScenarios: "runScenarios",
} as const;

export type DIKey = (typeof DI)[keyof typeof DI];

/**
 * Bootstraps the DI container with all production dependencies.
 */
export function bootstrapContainer(dataDir?: string): Container {
  const container = createContainer();

  // Infrastructure
  container.register<EconomicContextRepository>(DI.ContextRepo, () => new FileEconomicContextRepository(dataDir));
  container.register<ActorRepository>(DI.ActorRepo, () => new FileActorRepository());
  container.register<MediaCoverageRepository>(DI.MediaCoverageRepo, () => new FileMediaCoverageRepository());
  container.register<VoteRepository>(DI.VoteRepo, () => new FileVoteRepository());
  container.register<JudicialActionRepository>(DI.JudicialRepo, () => new FileJudicialActionRepository());
  container.register<ResearchReferenceRepository>(DI.ResearchRepo, () => new FileResearchReferenceRepository());
  container.register<PublicReactionRepository>(DI.PublicReactionRepo, () => new FilePublicReactionRepository());

  // Use Cases
  container.register<EvaluatePolicyUseCase>(
    DI.EvaluatePolicy,
    (c) => new EvaluatePolicyUseCase(c.resolve(DI.ContextRepo)),
  );

  container.register<ListCountriesUseCase>(
    DI.ListCountries,
    (c) => new ListCountriesUseCase(c.resolve(DI.ContextRepo)),
  );

  container.register<CompareCountriesUseCase>(
    DI.CompareCountries,
    (c) => new CompareCountriesUseCase(c.resolve(DI.ContextRepo)),
  );

  container.register<AnalyzeActorsUseCase>(DI.AnalyzeActors, (c) => new AnalyzeActorsUseCase(c.resolve(DI.ActorRepo)));

  container.register<AnalyzeMediaUseCase>(
    DI.AnalyzeMedia,
    (c) => new AnalyzeMediaUseCase(c.resolve(DI.MediaCoverageRepo)),
  );

  container.register<FullEvaluationUseCase>(
    DI.FullEvaluation,
    (c) =>
      new FullEvaluationUseCase(
        c.resolve(DI.ContextRepo),
        c.resolve(DI.ActorRepo),
        c.resolve(DI.MediaCoverageRepo),
        c.resolve(DI.VoteRepo),
        c.resolve(DI.JudicialRepo),
        c.resolve(DI.ResearchRepo),
        c.resolve(DI.PublicReactionRepo),
      ),
  );

  container.register<RunScenariosUseCase>(
    DI.RunScenarios,
    (c) => new RunScenariosUseCase(c.resolve(DI.ContextRepo), c.resolve(DI.FullEvaluation)),
  );

  return container;
}
