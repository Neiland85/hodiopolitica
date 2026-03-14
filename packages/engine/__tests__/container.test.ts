import { describe, it, expect, beforeEach } from 'vitest'
import { createContainer, Container } from '../shared/container/container'
import { bootstrapContainer, DI } from '../shared/container/composition-root'

describe('Container', () => {
  let container: Container

  beforeEach(() => {
    container = createContainer()
  })

  it('should register and resolve a dependency', () => {
    container.register('greeting', () => 'hello')
    expect(container.resolve('greeting')).toBe('hello')
  })

  it('should return the same instance for singletons', () => {
    let count = 0
    container.register('counter', () => {
      count++
      return { count }
    })
    const a = container.resolve<{ count: number }>('counter')
    const b = container.resolve<{ count: number }>('counter')
    expect(a).toBe(b) // same reference
    expect(count).toBe(1) // factory called only once
  })

  it('should create new instances for non-singletons', () => {
    let count = 0
    container.register('transient', () => ({ id: ++count }), false)
    const a = container.resolve<{ id: number }>('transient')
    const b = container.resolve<{ id: number }>('transient')
    expect(a.id).toBe(1)
    expect(b.id).toBe(2)
  })

  it('should resolve dependencies of dependencies', () => {
    container.register('name', () => 'World')
    container.register('greeting', (c) => `Hello, ${c.resolve<string>('name')}!`)
    expect(container.resolve('greeting')).toBe('Hello, World!')
  })

  it('should throw on unknown dependency', () => {
    expect(() => container.resolve('nonexistent')).toThrow('[DI] Dependency "nonexistent" is not registered')
  })

  it('should list registered dependencies', () => {
    container.register('a', () => 1)
    container.register('b', () => 2)
    expect(container.list()).toEqual(['a', 'b'])
  })

  it('should check if dependency exists', () => {
    container.register('exists', () => true)
    expect(container.has('exists')).toBe(true)
    expect(container.has('missing')).toBe(false)
  })

  it('should reset cached instances', () => {
    let count = 0
    container.register('resettable', () => ({ id: ++count }))
    const before = container.resolve<{ id: number }>('resettable')
    expect(before.id).toBe(1)

    container.resetInstances()

    const after = container.resolve<{ id: number }>('resettable')
    expect(after.id).toBe(2) // new instance after reset
  })
})

describe('Composition Root', () => {
  it('should bootstrap all production dependencies', () => {
    const container = bootstrapContainer()

    expect(container.has(DI.ContextRepo)).toBe(true)
    expect(container.has(DI.EvaluatePolicy)).toBe(true)
    expect(container.has(DI.ListCountries)).toBe(true)
    expect(container.has(DI.CompareCountries)).toBe(true)
  })

  it('should resolve use cases with injected repo', () => {
    const container = bootstrapContainer()

    // Should not throw — dependencies are properly wired
    expect(() => container.resolve(DI.EvaluatePolicy)).not.toThrow()
    expect(() => container.resolve(DI.CompareCountries)).not.toThrow()
  })
})
