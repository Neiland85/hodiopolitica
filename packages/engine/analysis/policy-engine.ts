import { PolicyDecision } from "../policy/policy-decision"
import { PolicyContext } from "../context/policy-context"
import { PolicyMetric } from "../metrics/policy-metric"
import { evaluateHousingPolicy } from "../models/housing-policy-model"

export function evaluatePolicy(
  decision: PolicyDecision,
  context: PolicyContext
): PolicyMetric[] {

  const metrics: PolicyMetric[] = []

  const title = decision.title.toLowerCase()

  if (title.includes("vivienda") || title.includes("housing")) {
    metrics.push(...evaluateHousingPolicy(decision, context))
  }

  if (metrics.length === 0) {
    metrics.push({
      policyId: decision.id,
      metricName: "generic_policy_analysis",
      value: 0,
      source: "policy-engine",
      timestamp: new Date()
    })
  }

  return metrics
}
