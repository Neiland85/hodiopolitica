/**
 * Result of evaluating a policy against economic indicators.
 * Each metric represents one measurable impact dimension.
 */
export interface PolicyMetric {
  /** Reference to the evaluated policy */
  policyId: string;
  /** Name of the metric (e.g. "housing_pressure", "social_stress") */
  metricName: string;
  /** Computed numeric value */
  value: number;
  /** Evaluation model that produced this metric */
  source: string;
  /** When the evaluation was performed */
  timestamp: Date;
  /** Human-readable explanation of what this metric means */
  description: string;
}

/**
 * Severity levels for metric interpretation.
 */
export type MetricSeverity = "low" | "moderate" | "high" | "critical";

/**
 * Classifies a metric value into a severity level.
 * Thresholds are domain-specific and should be calibrated.
 */
export function classifyMetricSeverity(value: number, thresholds: MetricThresholds): MetricSeverity {
  if (value >= thresholds.critical) return "critical";
  if (value >= thresholds.high) return "high";
  if (value >= thresholds.moderate) return "moderate";
  return "low";
}

export interface MetricThresholds {
  moderate: number;
  high: number;
  critical: number;
}
