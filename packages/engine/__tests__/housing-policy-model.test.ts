import { describe, expect, it } from "vitest";
import type { PolicyContext } from "../context/policy-context";
import { evaluateHousingPolicy } from "../models/housing-policy-model";
import type { PolicyDecision } from "../policy/policy-decision";

const basePolicy: PolicyDecision = {
  id: "test-housing-policy",
  title: "Test Housing Policy",
  description: "A test policy for unit testing",
  date: new Date("2023-01-01"),
  actors: ["test-actor"],
  objectives: ["test-objective"],
  domain: "housing",
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

describe("evaluateHousingPolicy", () => {
  it("should return exactly two metrics", () => {
    const metrics = evaluateHousingPolicy(basePolicy, baseContext);
    expect(metrics).toHaveLength(2);
  });

  it("should compute housing_pressure correctly", () => {
    const metrics = evaluateHousingPolicy(basePolicy, baseContext);
    const housingPressure = metrics.find((m) => m.metricName === "housing_pressure");

    expect(housingPressure).toBeDefined();
    // housing_price_index * (inflation / 10) = 148.2 * (3.5 / 10) = 148.2 * 0.35 = 51.87
    expect(housingPressure!.value).toBe(51.87);
    expect(housingPressure!.source).toBe("housing-policy-model");
    expect(housingPressure!.policyId).toBe("test-housing-policy");
  });

  it("should compute social_stress correctly", () => {
    const metrics = evaluateHousingPolicy(basePolicy, baseContext);
    const socialStress = metrics.find((m) => m.metricName === "social_stress");

    expect(socialStress).toBeDefined();
    // unemployment * inflation = 12.1 * 3.5 = 42.35
    expect(socialStress!.value).toBe(42.35);
    expect(socialStress!.source).toBe("housing-policy-model");
  });

  it("should include descriptions for all metrics", () => {
    const metrics = evaluateHousingPolicy(basePolicy, baseContext);
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

    const metrics = evaluateHousingPolicy(basePolicy, zeroContext);
    expect(metrics).toHaveLength(2);
    expect(metrics.every((m) => m.value === 0)).toBe(true);
  });

  it("should handle high-stress scenarios", () => {
    const crisisContext: PolicyContext = {
      ...baseContext,
      indicators: {
        inflation: 15.0,
        unemployment: 25.0,
        housing_price_index: 250.0,
        gdp_growth: -3.0,
      },
    };

    const metrics = evaluateHousingPolicy(basePolicy, crisisContext);
    const housingPressure = metrics.find((m) => m.metricName === "housing_pressure");
    const socialStress = metrics.find((m) => m.metricName === "social_stress");

    // 250 * (15/10) = 375.0
    expect(housingPressure!.value).toBe(375.0);
    // 25 * 15 = 375.0
    expect(socialStress!.value).toBe(375.0);
  });

  it("should set timestamps on all metrics", () => {
    const before = new Date();
    const metrics = evaluateHousingPolicy(basePolicy, baseContext);
    const after = new Date();

    for (const metric of metrics) {
      expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(metric.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });
});
