import type { PolicyDecision } from '../policy/policy-decision'
import type { PolicyContext } from '../context/policy-context'
import type { PolicyMetric } from '../metrics/policy-metric'

export function evaluateHousingPolicy(
  decision: PolicyDecision,
  context: PolicyContext
): PolicyMetric[] {
  const metrics: PolicyMetric[] = []

  const inflation = context.indicators['inflation'] || 0
  const unemployment = context.indicators['unemployment'] || 0
  const housingPrice = context.indicators['housing_price_index'] || 0

  metrics.push({
    policyId: decision.id,
    metricName: 'housing_pressure',
    value: housingPrice * (inflation / 10),
    source: 'housing-policy-model',
    timestamp: new Date(),
  })

  metrics.push({
    policyId: decision.id,
    metricName: 'social_stress',
    value: unemployment * inflation,
    source: 'housing-policy-model',
    timestamp: new Date(),
  })

  return metrics
}
