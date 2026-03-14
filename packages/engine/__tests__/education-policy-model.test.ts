import { describe, expect, it } from "vitest";
import type { PolicyContext } from "../context/policy-context";
import { evaluateEducationPolicy } from "../models/education-policy-model";
import type { PolicyDecision } from "../policy/policy-decision";

const policy: PolicyDecision = {
  id: "education-test",
  title: "Test Education Policy",
  description: "Testing education model",
  date: new Date(),
  actors: ["test"],
  objectives: ["test"],
  domain: "education",
};

describe("evaluateEducationPolicy", () => {
  it("should return exactly two metrics", () => {
    const context: PolicyContext = {
      country: "Spain",
      year: 2023,
      indicators: { inflation: 3.5, unemployment: 12.1, housing_price_index: 148.2, gdp_growth: 2.5 },
      sources: ["test"],
    };
    const metrics = evaluateEducationPolicy(policy, context);
    expect(metrics).toHaveLength(2);
    expect(metrics[0].metricName).toBe("education_investment_gap");
    expect(metrics[1].metricName).toBe("youth_opportunity_index");
  });

  it("should compute zero gap when GDP growth exceeds threshold", () => {
    const context: PolicyContext = {
      country: "Test",
      year: 2023,
      indicators: { inflation: 2.0, unemployment: 5.0, housing_price_index: 100, gdp_growth: 3.0 },
      sources: [],
    };
    const metrics = evaluateEducationPolicy(policy, context);
    const gap = metrics.find((m) => m.metricName === "education_investment_gap")!;
    expect(gap.value).toBe(0);
  });

  it("should compute positive gap when GDP growth is below threshold", () => {
    const context: PolicyContext = {
      country: "Test",
      year: 2023,
      indicators: { inflation: 3.0, unemployment: 10.0, housing_price_index: 100, gdp_growth: 0.5 },
      sources: [],
    };
    const metrics = evaluateEducationPolicy(policy, context);
    const gap = metrics.find((m) => m.metricName === "education_investment_gap")!;
    // (1.5 - 0.5) * 10.0 = 10.0
    expect(gap.value).toBe(10.0);
  });

  it("should compute youth opportunity index correctly", () => {
    const context: PolicyContext = {
      country: "Test",
      year: 2023,
      indicators: { inflation: 3.5, unemployment: 12.1, housing_price_index: 100, gdp_growth: 2.0 },
      sources: [],
    };
    const metrics = evaluateEducationPolicy(policy, context);
    const youth = metrics.find((m) => m.metricName === "youth_opportunity_index")!;
    // 100 - (12.1 * 2.5) - (3.5 * 1.5) = 100 - 30.25 - 5.25 = 64.5
    expect(youth.value).toBe(64.5);
  });

  it("should clamp youth opportunity between 0 and 100", () => {
    const extremeContext: PolicyContext = {
      country: "Test",
      year: 2023,
      indicators: { inflation: 50.0, unemployment: 50.0, housing_price_index: 100, gdp_growth: -5.0 },
      sources: [],
    };
    const metrics = evaluateEducationPolicy(policy, extremeContext);
    const youth = metrics.find((m) => m.metricName === "youth_opportunity_index")!;
    expect(youth.value).toBe(0); // clamped at 0
  });

  it("should include descriptions for all metrics", () => {
    const context: PolicyContext = {
      country: "Test",
      year: 2023,
      indicators: { inflation: 3.0, unemployment: 8.0, housing_price_index: 100, gdp_growth: 1.0 },
      sources: [],
    };
    const metrics = evaluateEducationPolicy(policy, context);
    for (const m of metrics) {
      expect(m.description.length).toBeGreaterThan(20);
    }
  });
});
