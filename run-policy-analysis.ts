import { evaluatePolicy } from "./packages/engine/analysis/policy-engine"

const policy = {
  id: "housing-law",
  title: "Ley de Vivienda",
  description: "Regulación del alquiler",
  country: "Spain",
  date: new Date(),
  actors: ["government"],
  objectives: ["reduce housing cost"]
}

const context = {
  country: "Spain",
  indicators: {
    inflation: 3.5,
    unemployment: 12.1,
    housing_price_index: 148.2
  }
}

const result = evaluatePolicy(policy, context)

console.log("\nPolicy Evaluation\n")
console.log(JSON.stringify(result, null, 2))
