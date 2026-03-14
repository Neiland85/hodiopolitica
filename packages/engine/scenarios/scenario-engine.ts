// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import type { EconomicIndicators, PolicyContext } from "../context/policy-context";
import type { PolicyQualityIndex } from "../pipeline/pqi-calculator";
import type { Scenario, ScenarioAssumptions } from "./scenario";

/**
 * Result of running a single scenario.
 */
export interface ScenarioResult {
  /** The scenario that was evaluated */
  readonly scenario: Scenario;
  /** The PQI produced under this scenario */
  readonly pqi: PolicyQualityIndex;
  /** Modified economic indicators used */
  readonly modifiedIndicators: EconomicIndicators;
}

/**
 * Comparison across multiple scenarios.
 */
export interface ScenarioComparison {
  /** All scenario results, ordered by PQI score descending */
  readonly scenarios: ScenarioResult[];
  /** Ranked scenario IDs from best to worst PQI */
  readonly ranking: string[];
  /** Best case scenario */
  readonly bestCase: ScenarioResult;
  /** Worst case scenario */
  readonly worstCase: ScenarioResult;
  /** Sensitivity analysis: which indicator overrides caused the largest PQI change */
  readonly sensitivityAnalysis: SensitivityEntry[];
}

/**
 * A sensitivity analysis entry showing the impact of an assumption.
 */
export interface SensitivityEntry {
  readonly scenarioId: string;
  readonly scenarioName: string;
  /** PQI score for this scenario */
  readonly pqiScore: number;
  /** Delta from baseline (first scenario is treated as baseline) */
  readonly deltaFromBaseline: number;
}

/**
 * Generates a modified PolicyContext by applying scenario assumptions.
 *
 * Pure function — no side effects.
 *
 * ## Modification Rules
 *
 * 1. **indicatorOverrides**: Merges with existing indicators (partial override).
 * 2. **sentimentShift**: Not applied at context level (handled by pipeline override).
 * 3. **actorOverrides**: Not applied at context level (handled by pipeline override).
 *
 * Only economic indicator overrides can be reflected in PolicyContext.
 * Actor and sentiment modifications are applied at the pipeline stage level
 * by the RunScenariosUseCase.
 */
export function generateModifiedContext(base: PolicyContext, assumptions: ScenarioAssumptions): PolicyContext {
  const modifiedIndicators = { ...base.indicators };

  if (assumptions.indicatorOverrides) {
    Object.assign(modifiedIndicators, assumptions.indicatorOverrides);
  }

  return {
    ...base,
    indicators: modifiedIndicators,
  };
}

/**
 * Compares multiple scenario results and produces a ranking and sensitivity analysis.
 *
 * Pure function — no side effects.
 *
 * ## Ranking
 * Scenarios are ranked by PQI score descending (best first).
 *
 * ## Sensitivity Analysis
 * Each scenario's PQI delta from the first (baseline) scenario is computed.
 * This shows which assumptions have the largest impact on policy quality.
 */
export function compareScenarios(results: ScenarioResult[]): ScenarioComparison {
  if (results.length === 0) {
    throw new Error("Cannot compare zero scenarios");
  }

  // Sort by PQI score descending
  const sorted = [...results].sort((a, b) => b.pqi.score - a.pqi.score);

  // Baseline is the first result (typically the "status quo" scenario)
  const baselineScore = results[0].pqi.score;

  const sensitivityAnalysis: SensitivityEntry[] = results.map((r) => ({
    scenarioId: r.scenario.id,
    scenarioName: r.scenario.name,
    pqiScore: r.pqi.score,
    deltaFromBaseline: round(r.pqi.score - baselineScore),
  }));

  return {
    scenarios: sorted,
    ranking: sorted.map((r) => r.scenario.id),
    bestCase: sorted[0],
    worstCase: sorted[sorted.length - 1],
    sensitivityAnalysis,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
