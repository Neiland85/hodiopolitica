import { describe, it, expect } from 'vitest'
import path from 'path'
import { FileEconomicContextRepository } from '../repositories/file-economic-context-repository'
import { evaluatePolicy } from '../analysis/policy-engine'
import type { PolicyDecision } from '../policy/policy-decision'

const dataDir = path.resolve(__dirname, '../../../data/sources')
const repo = new FileEconomicContextRepository(dataDir)

const housingPolicy: PolicyDecision = {
  id: 'housing-test',
  title: 'Housing Policy Test',
  description: 'Cross-country comparison',
  date: new Date(),
  actors: ['test'],
  objectives: ['test'],
  domain: 'housing',
}

describe('Multi-country evaluation', () => {
  const countries = ['spain', 'france', 'germany', 'italy']

  it('should have all 4 EU countries available', () => {
    const result = repo.listAvailableCountries()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.length).toBeGreaterThanOrEqual(4)
    }
  })

  for (const country of countries) {
    it(`should load and evaluate for ${country}`, () => {
      const ctxResult = repo.findByCountry(country)
      expect(ctxResult.ok).toBe(true)

      if (ctxResult.ok) {
        const metrics = evaluatePolicy(housingPolicy, ctxResult.value)
        expect(metrics.length).toBeGreaterThan(0)

        for (const m of metrics) {
          expect(m.value).toBeTypeOf('number')
          expect(m.value).not.toBeNaN()
        }
      }
    })
  }

  it('should produce different metric values per country', () => {
    const results: Record<string, number[]> = {}

    for (const country of countries) {
      const ctxResult = repo.findByCountry(country)
      if (ctxResult.ok) {
        const metrics = evaluatePolicy(housingPolicy, ctxResult.value)
        results[country] = metrics.map((m) => m.value)
      }
    }

    // Spain and Germany should produce different housing_pressure values
    expect(results['spain'][0]).not.toBe(results['germany'][0])
    expect(results['france'][0]).not.toBe(results['italy'][0])
  })
})
