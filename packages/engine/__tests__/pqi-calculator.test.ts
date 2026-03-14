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

describe("computePQI", () => {
  describe("domain-only (minimum viable PQI)", () => {
    it("should compute PQI from domain metrics only", () => {
      const metrics = [createMetric("housing_pressure", 45), createMetric("social_stress", 30)];

      const pqi = computePQI(metrics);

      // housing_pressure: 100-45 = 55, social_stress: 100-30 = 70 → avg = 62.5
      // Renormalized: only domain weight (0.4), so score = 62.5
      expect(pqi.score).toBeCloseTo(62.5, 0);
      expect(pqi.grade).toBe("B");
      expect(pqi.components).toHaveLength(1);
      expect(pqi.components[0].name).toBe("Domain Analysis");
      expect(pqi.summary).toContain("Grade B");
    });

    it("should assign grade A for high-quality policy (low stress metrics)", () => {
      const metrics = [createMetric("housing_pressure", 10), createMetric("social_stress", 5)];

      const pqi = computePQI(metrics);

      // 100-10=90, 100-5=95 → avg=92.5
      expect(pqi.score).toBeCloseTo(92.5, 0);
      expect(pqi.grade).toBe("A");
    });

    it("should assign grade F for very poor policy", () => {
      const metrics = [createMetric("housing_pressure", 95), createMetric("social_stress", 90)];

      const pqi = computePQI(metrics);

      // 100-95=5, 100-90=10 → avg=7.5
      expect(pqi.score).toBeCloseTo(7.5, 0);
      expect(pqi.grade).toBe("F");
    });

    it("should handle empty domain metrics with neutral score", () => {
      const pqi = computePQI([]);

      expect(pqi.score).toBe(50);
      expect(pqi.grade).toBe("C");
    });
  });

  describe("inverted metrics", () => {
    it("should use direct value for inverted metrics (higher is better)", () => {
      const metrics = [createMetric("youth_opportunity_index", 80), createMetric("green_transition_capacity", 70)];

      const pqi = computePQI(metrics);

      // Direct values: 80, 70 → avg=75
      expect(pqi.score).toBe(75);
      expect(pqi.grade).toBe("B");
    });

    it("should handle mix of regular and inverted metrics", () => {
      const metrics = [
        createMetric("housing_pressure", 40), // 100-40=60
        createMetric("youth_opportunity_index", 80), // direct=80
      ];

      const pqi = computePQI(metrics);

      // (60 + 80) / 2 = 70
      expect(pqi.score).toBe(70);
      expect(pqi.grade).toBe("B");
    });
  });

  describe("with actor analysis", () => {
    it("should include actor alignment and public legitimacy components", () => {
      const metrics = [createMetric("housing_pressure", 50)];
      const actors = createActorAnalysis({ alignmentScore: 60 });

      const pqi = computePQI(metrics, actors);

      expect(pqi.components).toHaveLength(3);
      expect(pqi.components.map((c) => c.name)).toEqual(["Domain Analysis", "Actor Alignment", "Public Legitimacy"]);

      // Actor score: (60 + 100) / 2 = 80
      const actorComponent = pqi.components.find((c) => c.name === "Actor Alignment");
      expect(actorComponent?.rawScore).toBe(80);
    });

    it("should map alignment [-100, 100] to [0, 100]", () => {
      const metrics = [createMetric("housing_pressure", 50)];

      // Alignment = -100 → actor score = 0
      const actors1 = createActorAnalysis({ alignmentScore: -100 });
      const pqi1 = computePQI(metrics, actors1);
      const actorComponent1 = pqi1.components.find((c) => c.name === "Actor Alignment");
      expect(actorComponent1?.rawScore).toBe(0);

      // Alignment = 100 → actor score = 100
      const actors2 = createActorAnalysis({ alignmentScore: 100 });
      const pqi2 = computePQI(metrics, actors2);
      const actorComponent2 = pqi2.components.find((c) => c.name === "Actor Alignment");
      expect(actorComponent2?.rawScore).toBe(100);
    });

    it("should derive public score from public actor influences", () => {
      const metrics = [createMetric("housing_pressure", 50)];
      const actors = createActorAnalysis({
        influences: [
          {
            actorId: "pub-1",
            actorType: "public",
            influenceScore: 70,
            influenceChannel: "electoral_behavior",
            stance: "support",
            description: "Public support",
          },
        ],
      });

      const pqi = computePQI(metrics, actors);
      const publicComponent = pqi.components.find((c) => c.name === "Public Legitimacy");
      expect(publicComponent?.rawScore).toBe(70);
    });

    it("should fall back to alignment when no public actors", () => {
      const metrics = [createMetric("housing_pressure", 50)];
      const actors = createActorAnalysis({
        alignmentScore: 40,
        influences: [
          {
            actorId: "pol-1",
            actorType: "politician",
            influenceScore: 60,
            influenceChannel: "voting",
            stance: "support",
            description: "Politician",
          },
        ],
      });

      const pqi = computePQI(metrics, actors);
      const publicComponent = pqi.components.find((c) => c.name === "Public Legitimacy");
      // Fallback: (40 + 100) / 2 = 70
      expect(publicComponent?.rawScore).toBe(70);
    });
  });

  describe("with media metrics", () => {
    it("should include media environment component", () => {
      const domainMetrics = [createMetric("housing_pressure", 50)];
      const mediaMetrics = [createMetric("narrative_distortion_index", 30), createMetric("media_influence_score", 40)];

      const pqi = computePQI(domainMetrics, undefined, mediaMetrics);

      expect(pqi.components).toHaveLength(2); // domain + media
      const mediaComponent = pqi.components.find((c) => c.name === "Media Environment");
      // 100 - 30 (distortion) = 70
      expect(mediaComponent?.rawScore).toBe(70);
    });

    it("should fall back to influence score when distortion not available", () => {
      const domainMetrics = [createMetric("housing_pressure", 50)];
      const mediaMetrics = [createMetric("media_influence_score", 40)];

      const pqi = computePQI(domainMetrics, undefined, mediaMetrics);

      const mediaComponent = pqi.components.find((c) => c.name === "Media Environment");
      // 100 - 40 = 60
      expect(mediaComponent?.rawScore).toBe(60);
    });
  });

  describe("full PQI with all components", () => {
    it("should compute weighted composite with all four components", () => {
      const domainMetrics = [createMetric("housing_pressure", 40)]; // domain=60
      const actors = createActorAnalysis({ alignmentScore: 60 }); // actor=80, public=50
      const mediaMetrics = [createMetric("narrative_distortion_index", 20)]; // media=80

      const pqi = computePQI(domainMetrics, actors, mediaMetrics);

      expect(pqi.components).toHaveLength(4);
      // Weights: domain=0.30, actors=0.15, public=0.10, media=0.10 → total=0.65
      // Weighted sum: 60*0.30 + 80*0.15 + 50*0.10 + 80*0.10 = 18 + 12 + 5 + 8 = 43
      // Renormalized: 43 / 0.65 ≈ 66.15
      expect(pqi.score).toBeCloseTo(66.15, 0);
      expect(pqi.grade).toBe("B");
    });

    it("should produce summary string with score and grade", () => {
      const pqi = computePQI([createMetric("housing_pressure", 50)]);

      expect(pqi.summary).toMatch(/PQI \d+(\.\d+)?\/100/);
      expect(pqi.summary).toContain("Grade");
      expect(pqi.summary).toContain("Based on:");
    });
  });

  describe("grade boundaries", () => {
    it("should assign correct grades at boundaries", () => {
      // Grade A: 80+
      expect(computePQI([createMetric("housing_pressure", 20)]).grade).toBe("A"); // 80

      // Grade B: 60-79
      expect(computePQI([createMetric("housing_pressure", 40)]).grade).toBe("B"); // 60

      // Grade C: 40-59
      expect(computePQI([createMetric("housing_pressure", 60)]).grade).toBe("C"); // 40

      // Grade D: 20-39
      expect(computePQI([createMetric("housing_pressure", 80)]).grade).toBe("D"); // 20

      // Grade F: 0-19
      expect(computePQI([createMetric("housing_pressure", 95)]).grade).toBe("F"); // 5
    });
  });

  describe("weight renormalization", () => {
    it("should renormalize weights when some components are missing", () => {
      // Domain only: weight=0.4, renormalized to 1.0
      const domainOnly = computePQI([createMetric("housing_pressure", 50)]); // score=50

      // Domain + actors: weights=0.4+0.25+0.15=0.8
      const actors = createActorAnalysis({ alignmentScore: 0 }); // actor=50, public=50
      const withActors = computePQI([createMetric("housing_pressure", 50)], actors);

      // Both should consider available components proportionally
      expect(domainOnly.components).toHaveLength(1);
      expect(withActors.components).toHaveLength(3);
    });
  });
});
