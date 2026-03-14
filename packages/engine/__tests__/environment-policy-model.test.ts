import { describe, expect, it } from "vitest";
import type { PolicyContext } from "../context/policy-context";
import { evaluateEnvironmentPolicy } from "../models/environment-policy-model";
import type { PolicyDecision } from "../policy/policy-decision";

const basePolicy: PolicyDecision = {
  id: "test-environment-policy",
  title: "Test Environment Policy",
  description: "A test policy for unit testing",
  date: new Date("2023-01-01"),
  actors: ["test-actor"],
  objectives: ["test-objective"],
  domain: "environment",
};

const baseContext: PolicyContext = {
  country: "Spain",
  year: 2023,
  indicators: {
    inflation: 3.5,
    unemployment: 12.1,
    housing_price_index: 148.2,
    gdp_growth: 2.5,
  },
  sources: ["INE", "Eurostat"],
};

describe("evaluateEnvironmentPolicy", () => {
  it("should return exactly two metrics", () => {
    const metrics = evaluateEnvironmentPolicy(basePolicy, baseContext);
    expect(metrics).toHaveLength(2);
    expect(metrics[0].metricName).toBe("green_transition_capacity");
    expect(metrics[1].metricName).toBe("environmental_policy_cost");
  });

  it("should compute green_transition_capacity correctly", () => {
    const metrics = evaluateEnvironmentPolicy(basePolicy, baseContext);
    const capacity = metrics.find((m) => m.metricName === "green_transition_capacity");

    expect(capacity).toBeDefined();
    // 100 - (unemployment * 4) + (gdp_growth * 12) - (inflation * 2)
    // = 100 - 48.4 + 30 - 7 = 74.6
    expect(capacity!.value).toBe(74.6);
    expect(capacity!.source).toBe("environment-policy-model");
    expect(capacity!.policyId).toBe("test-environment-policy");
  });

  it("should compute environmental_policy_cost correctly", () => {
    const metrics = evaluateEnvironmentPolicy(basePolicy, baseContext);
    const cost = metrics.find((m) => m.metricName === "environmental_policy_cost");

    expect(cost).toBeDefined();
    // (housing_price_index / 20) * (inflation / 3) + unemployment * 1.5
    // = (148.2 / 20) * (3.5 / 3) + 12.1 * 1.5 = 7.41 * 1.1667 + 18.15 = 8.645 + 18.15 = 26.8
    expect(cost!.value).toBe(26.8);
    expect(cost!.source).toBe("environment-policy-model");
  });

  it("should include descriptions for all metrics", () => {
    const metrics = evaluateEnvironmentPolicy(basePolicy, baseContext);
    for (const metric of metrics) {
      expect(metric.description).toBeTruthy();
      expect(typeof metric.description).toBe("string");
      expect(metric.description.length).toBeGreaterThan(10);
    }
  });

  it("should handle zero indicators gracefully", () => {
    const zeroContext: PolicyContext = {
      ...baseContext,
      indicators: {
        inflation: 0,
        unemployment: 0,
        housing_price_index: 0,
        gdp_growth: 0,
      },
    };

    const metrics = evaluateEnvironmentPolicy(basePolicy, zeroContext);
    expect(metrics).toHaveLength(2);
    // green_transition_capacity: 100 - 0 + 0 - 0 = 100 (clamped to 100)
    expect(metrics[0].value).toBe(100);
    // environmental_policy_cost: (0/20) * (0/3) + 0*1.5 = 0
    expect(metrics[1].value).toBe(0);
  });

  it("should clamp green_transition_capacity in crisis scenarios", () => {
    const crisisContext: PolicyContext = {
      ...baseContext,
      indicators: {
        inflation: 15.0,
        unemployment: 25.0,
        housing_price_index: 250.0,
        gdp_growth: -3.0,
      },
    };

    const metrics = evaluateEnvironmentPolicy(basePolicy, crisisContext);
    const capacity = metrics.find((m) => m.metricName === "green_transition_capacity");
    const cost = metrics.find((m) => m.metricName === "environmental_policy_cost");

    // Raw: 100 - 100 + (-36) - 30 = -66 → clamped to 0
    expect(capacity!.value).toBe(0);
    // (250 / 20) * (15 / 3) + 25 * 1.5 = 12.5 * 5 + 37.5 = 62.5 + 37.5 = 100
    expect(cost!.value).toBe(100);
  });

  it("should set timestamps on all metrics", () => {
    const before = new Date();
    const metrics = evaluateEnvironmentPolicy(basePolicy, baseContext);
    const after = new Date();

    for (const metric of metrics) {
      expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(metric.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });
});
