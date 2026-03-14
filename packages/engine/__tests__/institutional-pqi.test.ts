// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it } from "vitest";
import type { ActorAnalysisResult } from "../actors/actor-influence";
import type { EvaluatedMetric } from "../application/evaluate-policy.usecase";
import { computePQI } from "../pipeline/pqi-calculator";

// ─── Test Helpers ────────────────────────────────────────────

function createMetric(name: string, value: number): EvaluatedMetric {
  return {
    policyId: "test-policy",
    metricName: name,
    value,
    source: "test",
    description: `Test metric: ${name}`,
    severity: "low",
  };
}

function createActorAnalysis(overrides: Partial<ActorAnalysisResult> = {}): ActorAnalysisResult {
  return {
    influences: [
      {
        actorId: "actor-1",
        actorType: "politician",
        influenceScore: 60,
        influenceChannel: "voting",
        stance: "support",
        description: "Test politician",
      },
      {
        actorId: "actor-2",
        actorType: "public",
        influenceScore: 50,
        influenceChannel: "electoral_behavior",
        stance: "neutral",
        description: "Test public",
      },
    ],
    alignmentScore: 20,
    supportBalance: { supporting: 1, opposing: 0, neutral: 1, total: 2 },
    dominantChannel: "voting",
    analyzedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe("PQI with Institutional Component", () => {
  it("should include Institutional Viability when vote metrics are present", () => {
    const domainMetrics = [createMetric("housing_pressure", 40)];
    const voteMetrics = [createMetric("passage_probability", 70)];

    const pqi = computePQI(domainMetrics, undefined, undefined, voteMetrics);

    const institutional = pqi.components.find((c) => c.name === "Institutional Viability");
    expect(institutional).toBeDefined();
    expect(institutional?.rawScore).toBe(70); // Only passage_probability available
  });

  it("should include Institutional Viability when judicial metrics are present", () => {
    const domainMetrics = [createMetric("housing_pressure", 40)];
    const judicialMetrics = [createMetric("constitutional_compatibility", 80)];

    const pqi = computePQI(domainMetrics, undefined, undefined, undefined, judicialMetrics);

    const institutional = pqi.components.find((c) => c.name === "Institutional Viability");
    expect(institutional).toBeDefined();
    expect(institutional?.rawScore).toBe(80); // Only constitutional_compatibility available
  });

  it("should average passage_probability and constitutional_compatibility", () => {
    const domainMetrics = [createMetric("housing_pressure", 40)];
    const voteMetrics = [createMetric("passage_probability", 60)];
    const judicialMetrics = [createMetric("constitutional_compatibility", 80)];

    const pqi = computePQI(domainMetrics, undefined, undefined, voteMetrics, judicialMetrics);

    const institutional = pqi.components.find((c) => c.name === "Institutional Viability");
    expect(institutional).toBeDefined();
    expect(institutional?.rawScore).toBe(70); // (60 + 80) / 2
  });

  it("should not include Institutional Viability when neither vote nor judicial metrics exist", () => {
    const domainMetrics = [createMetric("housing_pressure", 40)];

    const pqi = computePQI(domainMetrics);

    const institutional = pqi.components.find((c) => c.name === "Institutional Viability");
    expect(institutional).toBeUndefined();
  });

  it("should compute full PQI with all five components", () => {
    const domainMetrics = [createMetric("housing_pressure", 40)]; // domain=60
    const actors = createActorAnalysis({ alignmentScore: 60 }); // actor=80, public=50
    const mediaMetrics = [createMetric("narrative_distortion_index", 20)]; // media=80
    const voteMetrics = [createMetric("passage_probability", 70)]; // institutional=70 (only passage)
    const judicialMetrics = [createMetric("constitutional_compatibility", 90)]; // institutional=(70+90)/2=80

    const pqi = computePQI(domainMetrics, actors, mediaMetrics, voteMetrics, judicialMetrics);

    expect(pqi.components).toHaveLength(5);
    expect(pqi.components.map((c) => c.name)).toEqual([
      "Domain Analysis",
      "Actor Alignment",
      "Public Legitimacy",
      "Media Environment",
      "Institutional Viability",
    ]);

    // Weights: domain=0.30, actors=0.15, public=0.10, media=0.10, institutional=0.10
    // Total weight = 0.75
    // Weighted sum = 60*0.30 + 80*0.15 + 50*0.10 + 80*0.10 + 80*0.10
    //              = 18 + 12 + 5 + 8 + 8 = 51
    // Renormalized: 51 / 0.75 = 68
    expect(pqi.score).toBeCloseTo(68, 0);
    expect(pqi.grade).toBe("B");
  });

  it("should handle institutional score affecting overall grade", () => {
    // Poor institutional backing can lower the overall grade
    const domainMetrics = [createMetric("housing_pressure", 30)]; // domain=70
    const voteMetrics = [createMetric("passage_probability", 20)]; // low passage
    const judicialMetrics = [createMetric("constitutional_compatibility", 10)]; // very low compat

    const pqi = computePQI(domainMetrics, undefined, undefined, voteMetrics, judicialMetrics);

    const institutional = pqi.components.find((c) => c.name === "Institutional Viability");
    expect(institutional?.rawScore).toBe(15); // (20 + 10) / 2 = 15
  });

  it("should renormalize correctly when some components are missing", () => {
    // Domain + institutional only
    const domainMetrics = [createMetric("housing_pressure", 50)]; // domain=50
    const voteMetrics = [createMetric("passage_probability", 70)];

    const pqiWithInstitutional = computePQI(domainMetrics, undefined, undefined, voteMetrics);

    // Weights: domain=0.30, institutional=0.10 → total=0.40
    // Score = (50*0.30 + 70*0.10) / 0.40 = (15 + 7) / 0.40 = 55
    expect(pqiWithInstitutional.components).toHaveLength(2);
    expect(pqiWithInstitutional.score).toBeCloseTo(55, 0);
  });

  it("should maintain backward compatibility (3-arg call still works)", () => {
    const domainMetrics = [createMetric("housing_pressure", 50)];
    const actors = createActorAnalysis({ alignmentScore: 0 });
    const mediaMetrics = [createMetric("narrative_distortion_index", 30)];

    // Calling without vote/judicial args should work exactly as before
    const pqi = computePQI(domainMetrics, actors, mediaMetrics);

    expect(pqi.components).toHaveLength(4); // domain, actor, public, media (no institutional)
    const institutional = pqi.components.find((c) => c.name === "Institutional Viability");
    expect(institutional).toBeUndefined();
  });

  it("should produce PQI summary including institutional component", () => {
    const domainMetrics = [createMetric("housing_pressure", 40)];
    const voteMetrics = [createMetric("passage_probability", 70)];

    const pqi = computePQI(domainMetrics, undefined, undefined, voteMetrics);

    expect(pqi.summary).toContain("Institutional Viability");
    expect(pqi.summary).toContain("Based on:");
  });

  it("PQI weight for institutional is 0.10", () => {
    const domainMetrics = [createMetric("housing_pressure", 40)];
    const voteMetrics = [createMetric("passage_probability", 70)];

    const pqi = computePQI(domainMetrics, undefined, undefined, voteMetrics);

    const institutional = pqi.components.find((c) => c.name === "Institutional Viability");
    expect(institutional?.weight).toBe(0.1);
  });
});
