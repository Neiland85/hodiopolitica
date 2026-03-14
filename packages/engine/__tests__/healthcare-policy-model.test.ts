import { describe, expect, it } from "vitest";
import type { PolicyContext } from "../context/policy-context";
import { evaluateHealthcarePolicy } from "../models/healthcare-policy-model";
import type { PolicyDecision } from "../policy/policy-decision";

const basePolicy: PolicyDecision = {
  id: "test-healthcare-policy",
  title: "Test Healthcare Policy",
  description: "A test policy for unit testing",
  date: new Date("2023-01-01"),
  actors: ["test-actor"],
  objectives: ["test-objective"],
  domain: "healthcare",
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

describe("evaluateHealthcarePolicy", () => {
  it("should return exactly two metrics", () => {
    const metrics = evaluateHealthcarePolicy(basePolicy, baseContext);
    expect(metrics).toHaveLength(2);
    expect(metrics[0].metricName).toBe("healthcare_access_pressure");
    expect(metrics[1].metricName).toBe("public_health_sustainability");
  });

  it("should compute healthcare_access_pressure correctly", () => {
    const metrics = evaluateHealthcarePolicy(basePolicy, baseContext);
    const accessPressure = metrics.find((m) => m.metricName === "healthcare_access_pressure");

    expect(accessPressure).toBeDefined();
    // unemployment * (inflation / 5) + (100 - gdp_growth * 10)
    // = 12.1 * (3.5 / 5) + (100 - 2.5 * 10) = 12.1 * 0.7 + 75 = 8.47 + 75 = 83.47
    expect(accessPressure!.value).toBe(83.47);
    expect(accessPressure!.source).toBe("healthcare-policy-model");
    expect(accessPressure!.policyId).toBe("test-healthcare-policy");
  });

  it("should compute public_health_sustainability correctly", () => {
    const metrics = evaluateHealthcarePolicy(basePolicy, baseContext);
    const sustainability = metrics.find((m) => m.metricName === "public_health_sustainability");

    expect(sustainability).toBeDefined();
    // 100 - (inflation * 3) - (unemployment * 2) + (gdp_growth * 5)
    // = 100 - 10.5 - 24.2 + 12.5 = 77.8
    expect(sustainability!.value).toBe(77.8);
    expect(sustainability!.source).toBe("healthcare-policy-model");
  });

  it("should include descriptions for all metrics", () => {
    const metrics = evaluateHealthcarePolicy(basePolicy, baseContext);
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

    const metrics = evaluateHealthcarePolicy(basePolicy, zeroContext);
    expect(metrics).toHaveLength(2);
    // healthcare_access_pressure: 0*(0/5) + (100 - 0*10) = 100 (clamped to 100)
    expect(metrics[0].value).toBe(100);
    // public_health_sustainability: 100 - 0 - 0 + 0 = 100
    expect(metrics[1].value).toBe(100);
  });

  it("should clamp values between 0 and 100 in crisis scenarios", () => {
    const crisisContext: PolicyContext = {
      ...baseContext,
      indicators: {
        inflation: 15.0,
        unemployment: 25.0,
        housing_price_index: 250.0,
        gdp_growth: -3.0,
      },
    };

    const metrics = evaluateHealthcarePolicy(basePolicy, crisisContext);
    const accessPressure = metrics.find((m) => m.metricName === "healthcare_access_pressure");
    const sustainability = metrics.find((m) => m.metricName === "public_health_sustainability");

    // Raw: 25*(15/5) + (100 - (-3)*10) = 75 + 130 = 205 → clamped to 100
    expect(accessPressure!.value).toBe(100);
    // Raw: 100 - 45 - 50 + (-15) = -10 → clamped to 0
    expect(sustainability!.value).toBe(0);
  });

  it("should set timestamps on all metrics", () => {
    const before = new Date();
    const metrics = evaluateHealthcarePolicy(basePolicy, baseContext);
    const after = new Date();

    for (const metric of metrics) {
      expect(metric.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(metric.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });
});
