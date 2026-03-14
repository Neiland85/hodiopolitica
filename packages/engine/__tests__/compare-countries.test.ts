import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { CompareCountriesUseCase } from "../application/compare-countries.usecase";
import type { PolicyDecision } from "../policy/policy-decision";
import { FileEconomicContextRepository } from "../repositories/file-economic-context-repository";
import { eventBus } from "../shared/events/event-bus";

const dataDir = path.resolve(__dirname, "../../../data/sources");

describe("CompareCountriesUseCase", () => {
  let useCase: CompareCountriesUseCase;
  const housingPolicy: PolicyDecision = {
    id: "compare-test",
    title: "Housing Comparison",
    description: "Cross-country comparison test",
    date: new Date(),
    actors: ["test"],
    objectives: ["compare"],
    domain: "housing",
  };

  beforeEach(() => {
    const repo = new FileEconomicContextRepository(dataDir);
    useCase = new CompareCountriesUseCase(repo);
    eventBus.reset();
  });

  it("should compare 4 EU countries successfully", () => {
    const result = useCase.execute({
      policy: housingPolicy,
      countries: ["spain", "france", "germany", "italy"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.comparisons).toHaveLength(4);
      expect(result.value.summary.countriesAnalyzed).toBe(4);
      expect(result.value.summary.bestPerforming).toBeTruthy();
      expect(result.value.summary.worstPerforming).toBeTruthy();
      expect(result.value.summary.highestVarianceMetric).toBeTruthy();
    }
  });

  it("should identify best and worst performing countries", () => {
    const result = useCase.execute({
      policy: housingPolicy,
      countries: ["spain", "germany"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const { bestPerforming, worstPerforming } = result.value.summary;
      expect(bestPerforming).not.toBe(worstPerforming);
    }
  });

  it("should reject fewer than 2 countries", () => {
    const result = useCase.execute({
      policy: housingPolicy,
      countries: ["spain"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should reject more than 10 countries", () => {
    const countries = Array.from({ length: 11 }, (_, i) => `country-${i}`);
    const result = useCase.execute({ policy: housingPolicy, countries });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("should skip unavailable countries gracefully", () => {
    const result = useCase.execute({
      policy: housingPolicy,
      countries: ["spain", "france", "atlantis"],
    });

    // Should succeed with 2 valid countries, skipping atlantis
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.comparisons).toHaveLength(2);
    }
  });

  it("should fail if too many countries are unavailable", () => {
    const result = useCase.execute({
      policy: housingPolicy,
      countries: ["atlantis", "narnia", "spain"],
    });

    // Only 1 valid — needs at least 2
    expect(result.ok).toBe(false);
  });

  it("should work with education domain", () => {
    const educationPolicy: PolicyDecision = {
      ...housingPolicy,
      id: "edu-compare",
      domain: "education",
    };

    const result = useCase.execute({
      policy: educationPolicy,
      countries: ["spain", "france", "germany", "italy"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.comparisons).toHaveLength(4);
      // Education metrics should include investment gap and youth opportunity
      const metricNames = result.value.comparisons[0].metrics.map((m) => m.metricName);
      expect(metricNames).toContain("education_investment_gap");
      expect(metricNames).toContain("youth_opportunity_index");
    }
  });

  it("should publish CountriesCompared event", () => {
    const handler = vi.fn();
    eventBus.subscribe("CountriesCompared", handler);

    useCase.execute({
      policy: housingPolicy,
      countries: ["spain", "france"],
    });

    expect(handler).toHaveBeenCalledOnce();
  });
});
