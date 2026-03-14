// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import path from "node:path";
import { describe, expect, it } from "vitest";
import { FullEvaluationUseCase } from "../application/full-evaluation.usecase";
import { RunScenariosUseCase } from "../application/run-scenarios.usecase";
import type { PolicyDecision } from "../policy/policy-decision";
import { FileActorRepository } from "../repositories/file-actor-repository";
import { FileEconomicContextRepository } from "../repositories/file-economic-context-repository";
import { FileJudicialActionRepository } from "../repositories/file-judicial-action-repository";
import { FileMediaCoverageRepository } from "../repositories/file-media-coverage-repository";
import { FilePublicReactionRepository } from "../repositories/file-public-reaction-repository";
import { FileResearchReferenceRepository } from "../repositories/file-research-reference-repository";
import { FileVoteRepository } from "../repositories/file-vote-repository";
import type { Scenario } from "../scenarios/scenario";

// ─── Test Fixtures ───────────────────────────────────────────

const dataDir = path.resolve(__dirname, "../../../data/sources");

const testPolicy: PolicyDecision = {
  id: "housing-law-2023",
  title: "Ley de Vivienda 2023",
  description: "Spanish housing regulation",
  date: new Date(),
  actors: ["gov"],
  objectives: ["affordable-housing"],
  domain: "housing",
};

function createFullEvaluationUseCase(): FullEvaluationUseCase {
  return new FullEvaluationUseCase(
    new FileEconomicContextRepository(dataDir),
    new FileActorRepository(),
    new FileMediaCoverageRepository(),
    new FileVoteRepository(),
    new FileJudicialActionRepository(),
    new FileResearchReferenceRepository(),
    new FilePublicReactionRepository(),
  );
}

// ─── Tests ───────────────────────────────────────────────────

describe("RunScenariosUseCase", () => {
  it("should execute multiple scenarios and produce a comparison", () => {
    const contextRepo = new FileEconomicContextRepository(dataDir);
    const fullEval = createFullEvaluationUseCase();
    const useCase = new RunScenariosUseCase(contextRepo, fullEval);

    const scenarios: Scenario[] = [
      {
        id: "status-quo",
        name: "Status Quo",
        description: "Baseline",
        assumptions: {},
      },
      {
        id: "optimistic",
        name: "Optimistic",
        description: "Better conditions",
        assumptions: {
          indicatorOverrides: { inflation: 1.5, unemployment: 8.0 },
        },
      },
      {
        id: "pessimistic",
        name: "Pessimistic",
        description: "Worse conditions",
        assumptions: {
          indicatorOverrides: { inflation: 6.0, unemployment: 18.0 },
        },
      },
    ];

    const result = useCase.execute({
      policy: testPolicy,
      country: "spain",
      scenarios,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.scenarios).toHaveLength(3);
    expect(result.value.ranking).toHaveLength(3);
    expect(result.value.bestCase).toBeDefined();
    expect(result.value.worstCase).toBeDefined();
    expect(result.value.sensitivityAnalysis).toHaveLength(3);
  });

  it("should produce valid PQI scores for each scenario", () => {
    const contextRepo = new FileEconomicContextRepository(dataDir);
    const fullEval = createFullEvaluationUseCase();
    const useCase = new RunScenariosUseCase(contextRepo, fullEval);

    const scenarios: Scenario[] = [
      {
        id: "baseline",
        name: "Baseline",
        description: "Default",
        assumptions: {},
      },
    ];

    const result = useCase.execute({
      policy: testPolicy,
      country: "spain",
      scenarios,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const pqi = result.value.scenarios[0].pqi;
    expect(pqi.score).toBeGreaterThanOrEqual(0);
    expect(pqi.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(pqi.grade);
  });

  it("should return error for empty scenarios array", () => {
    const contextRepo = new FileEconomicContextRepository(dataDir);
    const fullEval = createFullEvaluationUseCase();
    const useCase = new RunScenariosUseCase(contextRepo, fullEval);

    const result = useCase.execute({
      policy: testPolicy,
      country: "spain",
      scenarios: [],
    });

    expect(result.ok).toBe(false);
  });

  it("should return error for unknown country", () => {
    const contextRepo = new FileEconomicContextRepository(dataDir);
    const fullEval = createFullEvaluationUseCase();
    const useCase = new RunScenariosUseCase(contextRepo, fullEval);

    const result = useCase.execute({
      policy: testPolicy,
      country: "atlantis",
      scenarios: [{ id: "test", name: "Test", description: "", assumptions: {} }],
    });

    expect(result.ok).toBe(false);
  });

  it("should rank best case first in the comparison", () => {
    const contextRepo = new FileEconomicContextRepository(dataDir);
    const fullEval = createFullEvaluationUseCase();
    const useCase = new RunScenariosUseCase(contextRepo, fullEval);

    const scenarios: Scenario[] = [
      {
        id: "s1",
        name: "Scenario 1",
        description: "",
        assumptions: {},
      },
      {
        id: "s2",
        name: "Scenario 2",
        description: "",
        assumptions: { indicatorOverrides: { inflation: 1.0 } },
      },
    ];

    const result = useCase.execute({
      policy: testPolicy,
      country: "spain",
      scenarios,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Best case should have the highest PQI
    expect(result.value.bestCase.pqi.score).toBeGreaterThanOrEqual(result.value.worstCase.pqi.score);
  });

  it("should include sensitivity analysis with deltas from baseline", () => {
    const contextRepo = new FileEconomicContextRepository(dataDir);
    const fullEval = createFullEvaluationUseCase();
    const useCase = new RunScenariosUseCase(contextRepo, fullEval);

    const scenarios: Scenario[] = [
      {
        id: "baseline",
        name: "Baseline",
        description: "",
        assumptions: {},
      },
      {
        id: "alt",
        name: "Alternative",
        description: "",
        assumptions: { indicatorOverrides: { gdp_growth: 5.0 } },
      },
    ];

    const result = useCase.execute({
      policy: testPolicy,
      country: "spain",
      scenarios,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Baseline delta should be 0
    const baselineSensitivity = result.value.sensitivityAnalysis.find((s) => s.scenarioId === "baseline");
    expect(baselineSensitivity?.deltaFromBaseline).toBe(0);
  });
});
