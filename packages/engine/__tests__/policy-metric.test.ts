import { describe, expect, it } from "vitest";
import type { MetricThresholds } from "../metrics/policy-metric";
import { classifyMetricSeverity } from "../metrics/policy-metric";

const thresholds: MetricThresholds = {
  moderate: 30,
  high: 60,
  critical: 90,
};

describe("classifyMetricSeverity", () => {
  it("should classify low values", () => {
    expect(classifyMetricSeverity(0, thresholds)).toBe("low");
    expect(classifyMetricSeverity(15, thresholds)).toBe("low");
    expect(classifyMetricSeverity(29.9, thresholds)).toBe("low");
  });

  it("should classify moderate values", () => {
    expect(classifyMetricSeverity(30, thresholds)).toBe("moderate");
    expect(classifyMetricSeverity(45, thresholds)).toBe("moderate");
    expect(classifyMetricSeverity(59.9, thresholds)).toBe("moderate");
  });

  it("should classify high values", () => {
    expect(classifyMetricSeverity(60, thresholds)).toBe("high");
    expect(classifyMetricSeverity(75, thresholds)).toBe("high");
    expect(classifyMetricSeverity(89.9, thresholds)).toBe("high");
  });

  it("should classify critical values", () => {
    expect(classifyMetricSeverity(90, thresholds)).toBe("critical");
    expect(classifyMetricSeverity(100, thresholds)).toBe("critical");
    expect(classifyMetricSeverity(999, thresholds)).toBe("critical");
  });
});
