import { describe, it, expect, beforeAll } from 'vitest'
import path from 'path'
import { FileEconomicContextRepository } from '../repositories/file-economic-context-repository'

const dataDir = path.resolve(__dirname, '../../../data/sources')

describe('FileEconomicContextRepository', () => {
  let repo: FileEconomicContextRepository

  beforeAll(() => {
    repo = new FileEconomicContextRepository(dataDir)
  })

  describe('findByCountry', () => {
    it('should load Spain economic context successfully', () => {
      const result = repo.findByCountry('spain')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.country).toBe('Spain')
        expect(result.value.year).toBe(2023)
        expect(result.value.indicators.inflation).toBe(3.5)
        expect(result.value.indicators.unemployment).toBe(12.1)
        expect(result.value.indicators.housing_price_index).toBe(148.2)
        expect(result.value.indicators.gdp_growth).toBe(2.5)
        expect(result.value.sources).toContain('INE')
      }
    })

    it('should handle case-insensitive country names', () => {
      const result = repo.findByCountry('Spain')
      expect(result.ok).toBe(true)
    })

    it('should return DataSourceError for missing country', () => {
      const result = repo.findByCountry('narnia')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DATA_SOURCE_ERROR')
        expect(result.error.message).toContain('narnia')
      }
    })
  })

  describe('listAvailableCountries', () => {
    it('should list available countries', () => {
      const result = repo.listAvailableCountries()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toContain('Spain')
        expect(result.value.length).toBeGreaterThan(0)
      }
    })

    it('should return error for non-existent directory', () => {
      const badRepo = new FileEconomicContextRepository('/nonexistent/path')
      const result = badRepo.listAvailableCountries()

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('DATA_SOURCE_ERROR')
      }
    })
  })
})
