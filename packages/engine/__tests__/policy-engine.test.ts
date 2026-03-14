import { describe, it, expect } from 'vitest'
import { evaluatePolicy } from '../analysis/policy-engine'
import type { PolicyDecision } from '../policy/policy-decision'
import type { PolicyContext } from '../context/policy-context'

const baseContext: PolicyContext = {
  country: 'Spain',
  year: 2023,
  indicators: {
    inflation: 3.5,
    unemployment: 12.1,
    housing_price_index: 148.2,
    gdp_growth: 2.5,
  },
  sources: ['INE'],
}

describe('evaluatePolicy', () => {
  it('should route housing domain to housing evaluator', () => {
    const policy: PolicyDecision = {
      id: 'test-1',
      title: 'Housing Test',
      description: 'Test',
      date: new Date(),
      actors: ['test'],
      objectives: ['test'],
      domain: 'housing',
    }

    const metrics = evaluatePolicy(policy, baseContext)

    expect(metrics.length).toBeGreaterThan(0)
    expect(metrics[0].source).toBe('housing-policy-model')
  })

  it('should return generic metric for unsupported domains', () => {
    const policy: PolicyDecision = {
      id: 'test-2',
      title: 'Healthcare Test',
      description: 'Test',
      date: new Date(),
      actors: ['test'],
      objectives: ['test'],
      domain: 'healthcare',
    }

    const metrics = evaluatePolicy(policy, baseContext)

    expect(metrics).toHaveLength(1)
    expect(metrics[0].metricName).toBe('generic_policy_analysis')
    expect(metrics[0].source).toBe('policy-engine')
    expect(metrics[0].value).toBe(0)
  })

  it('should always reference the correct policyId', () => {
    const policy: PolicyDecision = {
      id: 'my-unique-id',
      title: 'Test',
      description: 'Test',
      date: new Date(),
      actors: [],
      objectives: [],
      domain: 'housing',
    }

    const metrics = evaluatePolicy(policy, baseContext)

    for (const metric of metrics) {
      expect(metric.policyId).toBe('my-unique-id')
    }
  })
})
