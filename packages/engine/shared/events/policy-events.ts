import type { MetricSeverity } from "../../metrics/policy-metric";
import type { PolicyDomain } from "../../policy/policy-decision";

/**
 * Concrete domain event payloads for the Policy bounded context.
 *
 * Each event type represents a meaningful fact in the policy lifecycle.
 */

/** Emitted when a policy is successfully evaluated. */
export interface PolicyEvaluatedPayload {
  policyId: string;
  domain: PolicyDomain;
  country: string;
  year: number;
  metricsCount: number;
  metrics: Array<{
    name: string;
    value: number;
    severity: MetricSeverity;
  }>;
  durationMs: number;
}

/** Emitted when a policy evaluation fails. */
export interface PolicyEvaluationFailedPayload {
  policyId: string;
  domain: PolicyDomain;
  errorCode: string;
  errorMessage: string;
}

/** Emitted when economic context is loaded from a data source. */
export interface EconomicContextLoadedPayload {
  country: string;
  year: number;
  source: string;
  indicatorCount: number;
}

/**
 * All known event type names.
 * Using const enum for zero-cost abstraction at runtime.
 */
export const PolicyEventTypes = {
  PolicyEvaluated: "PolicyEvaluated",
  PolicyEvaluationFailed: "PolicyEvaluationFailed",
  EconomicContextLoaded: "EconomicContextLoaded",
} as const;

export type PolicyEventType = (typeof PolicyEventTypes)[keyof typeof PolicyEventTypes];
