import { describe, it, expect } from "vitest"
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "../background/aiClient"

describe("model definitions", () => {
  it("has anthropic models with valid cost data", () => {
    expect(ANTHROPIC_MODELS.length).toBeGreaterThan(0)
    for (const model of ANTHROPIC_MODELS) {
      expect(model.id).toBeTruthy()
      expect(model.label).toBeTruthy()
      expect(model.costPer1kInput).toBeGreaterThan(0)
      expect(model.costPer1kOutput).toBeGreaterThan(0)
      expect(model.costPer1kOutput).toBeGreaterThanOrEqual(model.costPer1kInput)
    }
  })

  it("has openai models with valid cost data", () => {
    expect(OPENAI_MODELS.length).toBeGreaterThan(0)
    for (const model of OPENAI_MODELS) {
      expect(model.id).toBeTruthy()
      expect(model.label).toBeTruthy()
      expect(model.costPer1kInput).toBeGreaterThan(0)
      expect(model.costPer1kOutput).toBeGreaterThan(0)
    }
  })

  it("includes default models", () => {
    expect(ANTHROPIC_MODELS.find((m) => m.id === "claude-sonnet-4-6")).toBeDefined()
    expect(OPENAI_MODELS.find((m) => m.id === "gpt-4o")).toBeDefined()
  })
})
