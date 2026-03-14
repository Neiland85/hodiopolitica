import { PolicyDecision } from '../policy/policy-decision'

export function evaluatePolicy(decision: PolicyDecision) {
  return {
    decisionId: decision.id,
    evaluation: 'pending',
    indicators: []
  }
}
