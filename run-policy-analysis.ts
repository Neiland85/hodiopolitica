import { evaluatePolicy } from "./packages/engine/analysis/policy-engine"
import { loadEconomicContext } from "./packages/engine/datasets/load-economic-context"

const context = loadEconomicContext()

const policy = {
  id: "housing-law",
  title: "Ley de Vivienda",
  description: "Regulación del mercado del alquiler",
  country: "Spain",
  date: new Date(),
  actors: ["government"],
  objectives: ["reduce housing costs"]
}

const result = evaluatePolicy(policy, context)

console.log("\nPolicy Evaluation\n")
console.log(JSON.stringify(result, null, 2))
