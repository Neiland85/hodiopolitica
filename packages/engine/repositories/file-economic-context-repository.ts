import fs from 'fs'
import path from 'path'
import type { PolicyContext, EconomicIndicators } from '../context/policy-context'
import type { EconomicContextRepository } from './economic-context-repository'
import type { Result } from '../shared/result/result'
import { ok, fail } from '../shared/result/result'
import { DataSourceError, ValidationError, DomainError } from '../shared/errors/domain-error'
import { createLogger } from '../shared/logger/logger'

const logger = createLogger('repository.file')

/**
 * Loads economic context from JSON files on disk.
 *
 * File naming convention: {country-lowercase}-economic-context.json
 * Located in the configured data directory.
 */
export class FileEconomicContextRepository implements EconomicContextRepository {
  private readonly dataDir: string

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.resolve(__dirname, '../../../data/sources')
  }

  findByCountry(country: string): Result<PolicyContext, DomainError> {
    const filename = `${country.toLowerCase()}-economic-context.json`
    const filePath = path.join(this.dataDir, filename)

    logger.debug('Loading economic context', { country, filePath })

    if (!fs.existsSync(filePath)) {
      return fail(new DataSourceError(filename, `File not found at ${filePath}`))
    }

    let raw: string
    try {
      raw = fs.readFileSync(filePath, 'utf-8')
    } catch (err) {
      return fail(new DataSourceError(filename, (err as Error).message))
    }

    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch (err) {
      return fail(new DataSourceError(filename, `Invalid JSON: ${(err as Error).message}`))
    }

    return this.validate(data)
  }

  listAvailableCountries(): Result<string[], DomainError> {
    if (!fs.existsSync(this.dataDir)) {
      return fail(new DataSourceError(this.dataDir, 'Data directory not found'))
    }

    try {
      const files = fs.readdirSync(this.dataDir)
      const countries = files
        .filter((f) => f.endsWith('-economic-context.json'))
        .map((f) => f.replace('-economic-context.json', ''))
        .map((name) => name.charAt(0).toUpperCase() + name.slice(1))

      return ok(countries)
    } catch (err) {
      return fail(new DataSourceError(this.dataDir, (err as Error).message))
    }
  }

  private validate(data: unknown): Result<PolicyContext, DomainError> {
    if (!data || typeof data !== 'object') {
      return fail(new ValidationError('root', 'Expected an object'))
    }

    const obj = data as Record<string, unknown>

    if (typeof obj.country !== 'string' || obj.country.length === 0) {
      return fail(new ValidationError('country', 'Must be a non-empty string'))
    }

    if (typeof obj.year !== 'number' || !Number.isInteger(obj.year)) {
      return fail(new ValidationError('year', 'Must be an integer'))
    }

    if (!obj.indicators || typeof obj.indicators !== 'object') {
      return fail(new ValidationError('indicators', 'Must be an object'))
    }

    const ind = obj.indicators as Record<string, unknown>
    const requiredKeys: (keyof EconomicIndicators)[] = [
      'inflation',
      'unemployment',
      'housing_price_index',
      'gdp_growth',
    ]

    for (const key of requiredKeys) {
      const val = ind[key]
      if (typeof val !== 'number' || isNaN(val)) {
        return fail(new ValidationError(`indicators.${key}`, `Must be a valid number, got ${val}`))
      }
    }

    if (!Array.isArray(obj.sources)) {
      return fail(new ValidationError('sources', 'Must be an array'))
    }

    logger.info('Economic context loaded successfully', { country: obj.country, year: obj.year })

    return ok({
      country: obj.country,
      year: obj.year as number,
      indicators: {
        inflation: ind.inflation as number,
        unemployment: ind.unemployment as number,
        housing_price_index: ind.housing_price_index as number,
        gdp_growth: ind.gdp_growth as number,
      },
      sources: obj.sources.map(String),
    })
  }
}
