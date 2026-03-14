// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it } from "vitest";
import type { PolicyContext } from "../context/policy-context";
import type { PolicyQualityIndex } from "../pipeline/pqi-calculator";
import type { Scenario } from "../scenarios/scenario";
import type { ScenarioResult } from "../scenarios/scenario-engine";
import { compareScenarios, generateModifiedContext } from "../scenarios/scenario-engine";

// ─── Test Fixtures ───────────────────────────────────────────

const baseContext: PolicyContext = {
  country: "Spain",
  year: 2023,
  indicators: {
    inflation: 3.5,
    unemployment: 12.5,
    housing_price_index: 145,
    gdp_growth: 2.3,
  },
  sources: ["INE", "Banco de España"],
};

function createPQI(score: number): PolicyQualityIndex {
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
  return {
    score,
    grade: grade as PolicyQualityIndex["grade"],
    components: [],
    summary: `PQI ${score}/100`,
  };
}

function createScenario(id: string, name: string, overrides = {}): Scenario {
  return {
    id,
    name,
    description: `Test scenario: ${name}`,
    assumptions: overrides,
  };
}

function createResult(scenario: Scenario, pqiScore: number): ScenarioResult {
  return {
    scenario,
    pqi: createPQI(pqiScore),
    modifiedIndicators: baseContext.indicators,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("Scenario Engine — generateModifiedContext()", () => {
  it("should return unmodified context when no overrides are provided", () => {
    const result = generateModifiedContext(baseContext, {});

    expect(result.indicators).toEqual(baseContext.indicators);
    expect(result.country).toBe("Spain");
    expect(result.year).toBe(2023);
  });

  it("should apply partial indicator overrides", () => {
    const result = generateModifiedContext(baseContext, {
      indicatorOverrides: { inflation: 1.5, gdp_growth: 4.0 },
    });

    expect(result.indicators.inflation).toBe(1.5);
    expect(result.indicators.gdp_growth).toBe(4.0);
    // Unchanged indicators
    expect(result.indicators.unemployment).toBe(12.5);
    expect(result.indicators.housing_price_index).toBe(145);
  });

  it("should apply all indicator overrides at once", () => {
    const result = generateModifiedContext(baseContext, {
      indicatorOverrides: {
        inflation: 1.0,
        unemployment: 8.0,
        housing_price_index: 120,
        gdp_growth: 5.0,
      },
    });

    expect(result.indicators.inflation).toBe(1.0);
    expect(result.indicators.unemployment).toBe(8.0);
    expect(result.indicators.housing_price_index).toBe(120);
    expect(result.indicators.gdp_growth).toBe(5.0);
  });

  it("should not mutate the original context", () => {
    const original = { ...baseContext, indicators: { ...baseContext.indicators } };

    generateModifiedContext(baseContext, {
      indicatorOverrides: { inflation: 99.0 },
    });

    expect(baseContext.indicators.inflation).toBe(original.indicators.inflation);
  });

  it("should preserve sources and metadata", () => {
    const result = generateModifiedContext(baseContext, {
      indicatorOverrides: { inflation: 2.0 },
    });

    expect(result.sources).toEqual(["INE", "Banco de España"]);
    expect(result.year).toBe(2023);
  });
});

describe("Scenario Engine — compareScenarios()", () => {
  it("should rank scenarios by PQI score descending", () => {
    const s1 = createScenario("pessimistic", "Pessimistic");
    const s2 = createScenario("status-quo", "Status Quo");
    const s3 = createScenario("optimistic", "Optimistic");

    const results = [createResult(s1, 40), createResult(s2, 60), createResult(s3, 85)];

    const comparison = compareScenarios(results);

    expect(comparison.ranking).toEqual(["optimistic", "status-quo", "pessimistic"]);
  });

  it("should identify best and worst cases", () => {
    const s1 = createScenario("low", "Low");
    const s2 = createScenario("high", "High");

    const results = [createResult(s1, 30), createResult(s2, 90)];

    const comparison = compareScenarios(results);

    expect(comparison.bestCase.scenario.id).toBe("high");
    expect(comparison.bestCase.pqi.score).toBe(90);
    expect(comparison.worstCase.scenario.id).toBe("low");
    expect(comparison.worstCase.pqi.score).toBe(30);
  });

  it("should compute sensitivity analysis with deltas from baseline", () => {
    const s1 = createScenario("baseline", "Baseline");
    const s2 = createScenario("better", "Better");
    const s3 = createScenario("worse", "Worse");

    // First result is treated as baseline
    const results = [createResult(s1, 50), createResult(s2, 70), createResult(s3, 30)];

    const comparison = compareScenarios(results);

    expect(comparison.sensitivityAnalysis).toHaveLength(3);
    expect(comparison.sensitivityAnalysis[0].deltaFromBaseline).toBe(0); // baseline
    expect(comparison.sensitivityAnalysis[1].deltaFromBaseline).toBe(20); // +20
    expect(comparison.sensitivityAnalysis[2].deltaFromBaseline).toBe(-20); // -20
  });

  it("should throw when comparing zero scenarios", () => {
    expect(() => compareScenarios([])).toThrow("Cannot compare zero scenarios");
  });

  it("should handle a single scenario", () => {
    const s1 = createScenario("only", "Only Scenario");
    const results = [createResult(s1, 65)];

    const comparison = compareScenarios(results);

    expect(comparison.ranking).toEqual(["only"]);
    expect(comparison.bestCase.scenario.id).toBe("only");
    expect(comparison.worstCase.scenario.id).toBe("only");
    expect(comparison.sensitivityAnalysis[0].deltaFromBaseline).toBe(0);
  });

  it("should handle scenarios with identical PQI scores", () => {
    const s1 = createScenario("a", "Scenario A");
    const s2 = createScenario("b", "Scenario B");

    const results = [createResult(s1, 55), createResult(s2, 55)];

    const comparison = compareScenarios(results);

    expect(comparison.ranking).toHaveLength(2);
    expect(comparison.bestCase.pqi.score).toBe(55);
    expect(comparison.worstCase.pqi.score).toBe(55);
  });
});
