import fs from "fs"
import path from "path"

export function loadEconomicContext() {

  const datasetPath = path.join(
    process.cwd(),
    "data/sources/spain-economic-context.json"
  )

  const raw = fs.readFileSync(datasetPath, "utf-8")

  return JSON.parse(raw)
}
