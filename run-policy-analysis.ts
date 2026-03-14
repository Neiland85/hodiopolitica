// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Clarity Structures Digital S.L.

import { evaluatePolicy } from "@hodiopolitica/engine/analysis/policy-engine";
import { loadEconomicContext } from "@hodiopolitica/engine/datasets/load-economic-context";
import type { PolicyDecision } from "@hodiopolitica/engine/policy/policy-decision";

/**
 * CLI entry point: runs a policy evaluation and prints results.
 *
 * Usage: npm run engine
 */

const policy: PolicyDecision = {
  id: 'housing-law-2023',
  title: 'Ley de Vivienda',
  description: 'Regulación del mercado del alquiler y medidas de acceso a la vivienda',
  date: new Date('2023-05-25'),
  actors: ['gobierno', 'parlamento'],
  objectives: ['reducir coste vivienda', 'regular mercado alquiler', 'aumentar vivienda social'],
  domain: 'housing',
}

try {
  const context = loadEconomicContext()
  const metrics = evaluatePolicy(policy, context)

  console.log('\n=== HodioPolitica - Policy Evaluation ===\n')
  console.log('Policy:', policy.title)
  console.log('Domain:', policy.domain)
  console.log('Context:', `${context.country} (${context.year})`)
  console.log('\nMetrics:')
  console.log(JSON.stringify(metrics, null, 2))
} catch (error) {
  console.error('Evaluation failed:', (error as Error).message)
  process.exit(1)
}