// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { describe, expect, it } from "vitest";
import type { JudicialAction } from "../judicial/judicial-action";
import { evaluateJudicialRisk } from "../judicial/judicial-risk-model";
import type { PolicyDecision } from "../policy/policy-decision";

const basePolicy: PolicyDecision = {
  id: "test-policy",
  title: "Test Policy",
  description: "A test policy for judicial risk analysis",
  date: new Date("2023-01-01"),
  actors: ["gobierno"],
  objectives: ["test"],
  domain: "housing",
};

const baseAction: JudicialAction = {
  caseId: "TC-2023-001",
  policyId: "test-policy",
  court: "Tribunal Constitucional",
  type: "ruling",
  status: "decided",
  ruling: "upheld",
  impactScore: 50,
  precedentWeight: 0.5,
  date: "2023-06-15",
};

describe("evaluateJudicialRisk", () => {
  it("returns exactly 3 metrics", () => {
    const metrics = evaluateJudicialRisk(basePolicy, [baseAction]);

    expect(metrics).toHaveLength(3);
    expect(metrics.map((m) => m.metricName)).toEqual([
      "legal_challenge_risk",
      "constitutional_compatibility",
      "enforcement_uncertainty",
    ]);
  });

  it("returns safe defaults for no actions", () => {
    const metrics = evaluateJudicialRisk(basePolicy, []);

    expect(metrics[0].value).toBe(0); // legal_challenge_risk: no risk
    expect(metrics[1].value).toBe(100); // constitutional_compatibility: fully compatible
    expect(metrics[2].value).toBe(0); // enforcement_uncertainty: no uncertainty
  });

  it("computes legal_challenge_risk from pending and struck-down cases", () => {
    const actions: JudicialAction[] = [
      { ...baseAction, status: "pending", ruling: undefined },
      { ...baseAction, caseId: "TC-2023-002", status: "decided", ruling: "struck_down" },
    ];

    const metrics = evaluateJudicialRisk(basePolicy, actions);
    const lcr = metrics[0];

    // 1 pending × 20 + 1 struck_down × 30 = 50
    expect(lcr.value).toBe(50);
    expect(lcr.source).toBe("judicial-risk-model");
  });

  it("caps legal_challenge_risk at 100", () => {
    const actions: JudicialAction[] = Array.from({ length: 5 }, (_, i) => ({
      ...baseAction,
      caseId: `TC-${i}`,
      status: "pending" as const,
      ruling: undefined,
    }));

    const metrics = evaluateJudicialRisk(basePolicy, actions);

    // 5 × 20 = 100
    expect(metrics[0].value).toBe(100);
  });

  it("computes constitutional_compatibility correctly", () => {
    const actions: JudicialAction[] = [
      { ...baseAction, type: "constitutional_review" },
      { ...baseAction, caseId: "TC-002", type: "constitutional_review", status: "decided", ruling: "struck_down" },
    ];

    const metrics = evaluateJudicialRisk(basePolicy, actions);
    const cc = metrics[1];

    // 2 constitutional_reviews × 25 + 1 struck_down × 40 = 90
    // compatibility = 100 - 90 = 10
    expect(cc.value).toBe(10);
  });

  it("floors constitutional_compatibility at 0", () => {
    const actions: JudicialAction[] = [
      { ...baseAction, type: "constitutional_review", status: "decided", ruling: "struck_down" },
      { ...baseAction, caseId: "TC-002", type: "constitutional_review", status: "decided", ruling: "struck_down" },
    ];

    const metrics = evaluateJudicialRisk(basePolicy, actions);
    const cc = metrics[1];

    // 2 × 25 + 2 × 40 = 130 → 100 - 130 = -30 → capped at 0
    expect(cc.value).toBe(0);
  });

  it("computes enforcement_uncertainty correctly", () => {
    const actions: JudicialAction[] = [
      { ...baseAction, status: "pending", ruling: undefined },
      { ...baseAction, caseId: "TC-002", type: "injunction" },
      { ...baseAction, caseId: "TC-003" },
    ];

    const metrics = evaluateJudicialRisk(basePolicy, actions);
    const eu = metrics[2];

    // pending ratio = 1/3
    // injunctions = 1
    // uncertainty = (1/3 × 50) + (1 × 20) = 16.67 + 20 = 36.67
    expect(eu.value).toBeCloseTo(36.67, 1);
  });

  it("caps enforcement_uncertainty at 100", () => {
    const actions: JudicialAction[] = Array.from({ length: 5 }, (_, i) => ({
      ...baseAction,
      caseId: `TC-${i}`,
      type: "injunction" as const,
    }));

    const metrics = evaluateJudicialRisk(basePolicy, actions);

    // 5 injunctions × 20 = 100 (plus pending ratio)
    expect(metrics[2].value).toBe(100);
  });

  it("upheld rulings don't increase legal challenge risk", () => {
    const actions: JudicialAction[] = [
      { ...baseAction, status: "decided", ruling: "upheld" },
      { ...baseAction, caseId: "TC-002", status: "decided", ruling: "upheld" },
    ];

    const metrics = evaluateJudicialRisk(basePolicy, actions);

    // No pending, no struck_down → 0 risk
    expect(metrics[0].value).toBe(0);
  });

  it("partial rulings don't count as struck_down", () => {
    const actions: JudicialAction[] = [{ ...baseAction, status: "decided", ruling: "partial" }];

    const metrics = evaluateJudicialRisk(basePolicy, actions);

    // No struck_down → no risk from decided cases
    expect(metrics[0].value).toBe(0);
    // But constitutional review still counts
    expect(metrics[1].value).toBe(100); // No constitutional reviews → full compatibility
  });

  it("handles a realistic Spain housing law scenario", () => {
    const actions: JudicialAction[] = [
      {
        caseId: "TC-2023-0042",
        policyId: "test-policy",
        court: "Tribunal Constitucional",
        type: "constitutional_review",
        status: "pending",
        impactScore: 85,
        precedentWeight: 0.9,
        date: "2023-06-15",
      },
      {
        caseId: "TS-2023-1187",
        policyId: "test-policy",
        court: "Tribunal Supremo",
        type: "injunction",
        status: "decided",
        ruling: "partial",
        impactScore: 60,
        precedentWeight: 0.7,
        date: "2023-09-20",
      },
      {
        caseId: "TC-2024-0015",
        policyId: "test-policy",
        court: "Tribunal Constitucional",
        type: "appeal",
        status: "pending",
        impactScore: 45,
        precedentWeight: 0.5,
        date: "2024-01-10",
      },
    ];

    const metrics = evaluateJudicialRisk(basePolicy, actions);

    // 2 pending × 20 = 40
    expect(metrics[0].value).toBe(40);
    // 1 constitutional_review × 25 = 25, 0 struck_down → compatibility = 75
    expect(metrics[1].value).toBe(75);
    // pending ratio = 2/3 × 50 = 33.33, 1 injunction × 20 = 20 → 53.33
    expect(metrics[2].value).toBeCloseTo(53.33, 1);
  });

  it("includes timestamp in each metric", () => {
    const before = new Date();
    const metrics = evaluateJudicialRisk(basePolicy, [baseAction]);
    const after = new Date();

    for (const m of metrics) {
      expect(m.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(m.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });
});
