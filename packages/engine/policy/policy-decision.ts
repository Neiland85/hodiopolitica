/**
 * Represents a formal policy decision made by government actors.
 * This is the core entity that the engine evaluates.
 */
export interface PolicyDecision {
  /** Unique identifier (kebab-case, e.g. "housing-law-2023") */
  id: string
  /** Human-readable title of the policy */
  title: string
  /** Detailed description of the policy and its intent */
  description: string
  /** Date when the policy was enacted or proposed */
  date: Date
  /** Institutional actors involved (e.g. ["government", "parliament"]) */
  actors: string[]
  /** Stated objectives of the policy */
  objectives: string[]
  /** Policy domain for routing to the correct evaluation model */
  domain: PolicyDomain
}

/**
 * Supported policy domains.
 * Each domain maps to a specialized evaluation model.
 */
export type PolicyDomain = 'housing' | 'education' | 'healthcare' | 'economy' | 'environment'
