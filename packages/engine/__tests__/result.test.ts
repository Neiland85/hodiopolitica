import { describe, it, expect } from 'vitest'
import { ok, fail, map, flatMap } from '../shared/result/result'

describe('Result type', () => {
  describe('ok', () => {
    it('should create a successful result', () => {
      const result = ok(42)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('should work with complex types', () => {
      const result = ok({ name: 'test', values: [1, 2, 3] })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.name).toBe('test')
        expect(result.value.values).toHaveLength(3)
      }
    })
  })

  describe('fail', () => {
    it('should create a failure result', () => {
      const result = fail(new Error('something went wrong'))
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toBe('something went wrong')
      }
    })
  })

  describe('map', () => {
    it('should transform the value on success', () => {
      const result = map(ok(5), (x) => x * 2)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toBe(10)
    })

    it('should pass through failures unchanged', () => {
      const error = new Error('fail')
      const result = map(fail(error), (x: number) => x * 2)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe(error)
    })
  })

  describe('flatMap', () => {
    it('should chain successful operations', () => {
      const result = flatMap(ok(10), (x) => ok(x + 5))
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toBe(15)
    })

    it('should stop at first failure', () => {
      const error = new Error('chain broken')
      const result = flatMap(ok(10), () => fail(error))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe(error)
    })

    it('should not execute fn on failure input', () => {
      let called = false
      const result = flatMap(fail(new Error('initial fail')), () => {
        called = true
        return ok(42)
      })
      expect(called).toBe(false)
      expect(result.ok).toBe(false)
    })
  })
})
