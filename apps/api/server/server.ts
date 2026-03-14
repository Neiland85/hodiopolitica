import express from "express"

import { evaluatePolicy } from "../../../packages/engine/analysis/policy-engine"
import { loadEconomicContext } from "../../../packages/engine/datasets/load-economic-context"

const app = express()
app.use(express.json())

app.get("/api/policy/evaluate", (req, res) => {

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

  const metrics = evaluatePolicy(policy, context)

  const scenarios = [
    { name: "status_quo", description: "Aplicar la ley tal cual" },
    { name: "moderate_adjustment", description: "Ajuste moderado de la regulación" },
    { name: "alternative_policy", description: "Política alternativa basada en incentivos" }
  ]

  res.json({
    policy,
    context,
    metrics,
    scenarios
  })
})

const PORT = 3000

app.listen(PORT, () => {
  console.log(`HodioPolitica API running on port ${PORT}`)
})
