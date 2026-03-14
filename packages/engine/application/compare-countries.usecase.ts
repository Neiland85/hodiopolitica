import type { PolicyDecision } from '../policy/policy-decision'
import type { EconomicContextRepository } from '../repositories/economic-context-repository'
import type { Result } from '../shared/result/result'
import type { DomainError } from '../shared/errors/domain-error'
import { ok, fail } from '../shared/result/result'
import { evaluatePolicy } from '../analysis/policy-engine'
import { classifyMetricSeverity } from '../metrics/policy-metric'
import type { MetricThresholds } from '../metrics/policy-metric'
import { ValidationError } from '../shared/errors/domain-error'
import { createEvent } from '../shared/events/domain-event'
import { eventBus } from '../shared/events/event-bus'
import { createLogger } from '../shared/logger/logger'

const logger = createLogger('usecase.compare-countries')

/**
 * Command DTO for multi-country comparison.
 */
export interface CompareCountriesCommand {
  policy: PolicyDecision
  countries: string[]
  correlationId?: string
}

/**
 * Result of comparing a policy across multiple countries.
 */
export interface ComparisonResult {
  policy: { id: string; title: string; domain: string }
  comparisons: CountryComparison[]
  summary: ComparisonSummary
  evaluatedAt: string
}

export interface CountryComparison {
  country: string
  year: number
  sources: string[]
  metrics: Array<{
    metricName: string
    value: number
    severity: 'low' | 'moderate' | 'high' | 'critical'
    description: string
  }>
}

export interface ComparisonSummary {
  /** Country with the best (lowest stress) aggregate */
  bestPerforming: string
  /** Country with the worst (highest stress) aggregate */
  worstPerforming: string
  /** Number of countries analyzed */
  countriesAnalyzed: number
  /** Metric with the highest variance across countries */
  highestVarianceMetric: string
}

const METRIC_THRESHOLDS: Record<string, MetricThresholds> = {
  housing_pressure: { moderate: 30, high: 60, critical: 90 },
  social_stress: { moderate: 20, high: 40, critical: 60 },
  education_investment_gap: { moderate: 10, high: 25, critical: 40 },
  youth_opportunity_index: { moderate: 70, high: 50, critical: 30 },
}

const DEFAULT_THRESHOLDS: MetricThresholds = { moderate: 30, high: 60, critical: 90 }

/**
 * Use Case: Compare a Policy Across Multiple Countries
 *
 * Evaluates the same policy in each country's economic context,
 * then produces a comparative analysis with a summary.
 */
export class CompareCountriesUseCase {
  constructor(private readonly contextRepo: EconomicContextRepository) {}

  execute(command: CompareCountriesCommand): Result<ComparisonResult, DomainError> {
    if (command.countries.length < 2) {
      return fail(new ValidationError('countries', 'At least 2 countries are required for comparison'))
    }

    if (command.countries.length > 10) {
      return fail(new ValidationError('countries', 'Maximum 10 countries per comparison'))
    }

    logger.info('Comparing policy across countries', {
      policyId: command.policy.id,
      countries: command.countries,
    })

    const comparisons: CountryComparison[] = []
    const errors: string[] = []

    for (const country of command.countries) {
      const ctxResult = this.contextRepo.findByCountry(country)
      if (!ctxResult.ok) {
        errors.push(`${country}: ${ctxResult.error.message}`)
        continue
      }

      const context = ctxResult.value
      const rawMetrics = evaluatePolicy(command.policy, context)

      comparisons.push({
        country: context.country,
        year: context.year,
        sources: context.sources,
        metrics: rawMetrics.map((m) => {
          const isInverted = m.metricName === 'youth_opportunity_index'
          const thresholds = METRIC_THRESHOLDS[m.metricName] || DEFAULT_THRESHOLDS

          return {
            metricName: m.metricName,
            value: m.value,
            severity: isInverted
              ? classifyInvertedSeverity(m.value, thresholds)
              : classifyMetricSeverity(m.value, thresholds),
            description: m.description,
          }
        }),
      })
    }

    if (comparisons.length < 2) {
      return fail(
        new ValidationError(
          'countries',
          `Only ${comparisons.length} country loaded successfully. Errors: ${errors.join('; ')}`,
        ),
      )
    }

    const summary = this.buildSummary(comparisons)

    const result: ComparisonResult = {
      policy: {
        id: command.policy.id,
        title: command.policy.title,
        domain: command.policy.domain,
      },
      comparisons,
      summary,
      evaluatedAt: new Date().toISOString(),
    }

    eventBus.publish(
      createEvent(
        'CountriesCompared',
        'compare-countries-usecase',
        {
          policyId: command.policy.id,
          countriesCompared: comparisons.length,
          bestPerforming: summary.bestPerforming,
          worstPerforming: summary.worstPerforming,
        },
        command.correlationId,
      ),
    )

    logger.info('Comparison complete', {
      policyId: command.policy.id,
      countriesCompared: comparisons.length,
      bestPerforming: summary.bestPerforming,
    })

    return ok(result)
  }

  private buildSummary(comparisons: CountryComparison[]): ComparisonSummary {
    // Aggregate: sum of all metric values per country (lower = better for stress metrics)
    const aggregates = comparisons.map((c) => ({
      country: c.country,
      total: c.metrics.reduce((sum, m) => {
        // For inverted metrics (higher = better), flip the sign
        const isInverted = m.metricName === 'youth_opportunity_index'
        return sum + (isInverted ? 100 - m.value : m.value)
      }, 0),
    }))

    aggregates.sort((a, b) => a.total - b.total)

    // Variance per metric
    const metricNames = comparisons[0]?.metrics.map((m) => m.metricName) || []
    let highestVarianceMetric = metricNames[0] || 'none'
    let highestVariance = 0

    for (const name of metricNames) {
      const values = comparisons.map((c) => c.metrics.find((m) => m.metricName === name)?.value || 0)
      const mean = values.reduce((s, v) => s + v, 0) / values.length
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
      if (variance > highestVariance) {
        highestVariance = variance
        highestVarianceMetric = name
      }
    }

    return {
      bestPerforming: aggregates[0]?.country || 'unknown',
      worstPerforming: aggregates[aggregates.length - 1]?.country || 'unknown',
      countriesAnalyzed: comparisons.length,
      highestVarianceMetric,
    }
  }
}

/** For inverted metrics (higher = better), severity thresholds work in reverse. */
function classifyInvertedSeverity(
  value: number,
  thresholds: MetricThresholds,
): 'low' | 'moderate' | 'high' | 'critical' {
  if (value <= thresholds.critical) return 'critical'
  if (value <= thresholds.high) return 'high'
  if (value <= thresholds.moderate) return 'moderate'
  return 'low'
}
