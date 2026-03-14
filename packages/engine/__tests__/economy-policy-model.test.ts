import { describe, expect, it } from "vitest";
import type { PolicyContext } from "../context/policy-context";
import { evaluateEconomyPolicy } from "../models/economy-policy-model";
import type { PolicyDecision } from "../policy/policy-decision";

const basePolicy: PolicyDecision = {
  id: "test-economy-policy",
  title: "Test Economy Policy",
  description: "A test policy for unit testing",
  date: new Date("2023-01-01"),
  actors: ["test-actor"],
  objectives: ["test-objective"],
  domain: "economy",
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

describe("evaluateEconomyPolicy", () => {
  it("should return exactly two metrics", () => {
    const metrics = evaluateEconomyPolicy(basePolicy, baseContext);
    expect(metrics).toHaveLength(2);
    expect(metrics[0].metricName).toBe("economic_stability_index");
    expect(metrics[1].metricName).toBe("fiscal_pressure_index");
  });

  it("should compute economic_stability_index correctly", () => {
    const metrics = evaluateEconomyPolicy(basePolicy, baseContext);
    const stability = metrics.find((m) => m.metricName === "economic_stability_index");

    expect(stability).toBeDefined();
    // 100 - (inflation * 5) - (unemployment * 3) + (gdp_growth * 8)
    // = 100 - 17.5 - 36.3 + 20 = 66.2
    expect(stability!.value).toBe(66.2);
    expect(stability!.source).toBe("economy-policy-model");
    expect(stability!.policyId).toBe("test-economy-policy");
  });

  it("should compute fiscal_pressure_index correctly", () => {
    const metrics = evaluateEconomyPolicy(basePolicy, baseContext);
    const fiscal = metrics.find((m) => m.metricName === "fiscal_pressure_index");

    expect(fiscal).toBeDefined();
    // (unemployment * inflation) + (housing_price_index / 10)
    // = (12.1 * 3.5) + (148.2 / 10) = 42.35 + 14.82 = 57.17
    expect(fiscal!.value).toBe(57.17);
    expect(fiscal!.source).toBe("economy-policy-model");
  });

  it("should include descriptions for all metrics", () => {
    const metrics = evaluateEconomyPolicy(basePolicy, baseContext);
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

    const metrics = evaluateEconomyPolicy(basePolicy, zeroContext);
    expect(metrics).toHaveLength(2);
    // economic_stability_index: 100 - 0 - 0 + 0 = 100 (clamped to 100)
    expect(metrics[0].value).toBe(100);
    // fiscal_pressure_index: 0 * 0 + 0 / 10 = 0
    expect(metrics[1].value).toBe(0);
  });

  it("should clamp economic_stability_index in crisis scenarios", () => {
    const crisisContext: PolicyContext = {
      ...baseContext,
      indicators: {
        inflation: 15.0,
        unemployment: 25.0,
        housing_price_index: 250.0,
        gdp_growth: -3.0,
      },
    };

    const metrics = evaluateEconomyPolicy(basePolicy, crisisContext);
    const stability = metrics.find((m) => m.metricName === "economic_stability_index");
    const fiscal = metrics.find((m) => m.metricName === "fiscal_pressure_index");

    // Raw: 100 - 75 - 75 + (-24) = -74 → clamped to 0
    expect(stability!.value).toBe(0);
    // (25 * 15) + (250 / 10) = 375 + 25 = 400 (not clamped)
    expect(fiscal!.value).toBe(400);
  });

  it("should set timestamps on all metrics", () => {
    const before = new Date();
    const metrics = evaluateEconomyPolicy(basePolicy, baseContext);
    const after = new Date();

    for (const metric of metrics) {
      expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(metric.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });
});
