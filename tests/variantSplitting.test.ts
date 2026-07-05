import { describe, it, expect } from "vitest"

function splitVariants(text: string, count: number): string[] {
  const cleaned = text.replace(/—/g, ",").replace(/–/g, "-").replace(/--/g, ",")
  const variants = cleaned
    .split(/\n===\n|^===$/m)
    .map((v) => v.trim())
    .filter(Boolean)

  if (variants.length >= count) {
    return variants.slice(0, count)
  }
  return variants.length > 0 ? variants : [cleaned.trim()]
}

describe("variant splitting", () => {
  it("splits two variants on === delimiter", () => {
    const input = "Hi John,\n\nFirst message.\n\nBest,\nJane\n===\nHi John,\n\nSecond message.\n\nCheers,\nJane"
    const result = splitVariants(input, 2)
    expect(result).toHaveLength(2)
    expect(result[0]).toContain("First message")
    expect(result[1]).toContain("Second message")
  })

  it("handles single variant", () => {
    const input = "Hi John,\n\nSingle message.\n\nBest,\nJane"
    const result = splitVariants(input, 1)
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("Single message")
  })

  it("replaces em dashes with commas", () => {
    const input = "Great work — really impressive"
    const result = splitVariants(input, 1)
    expect(result[0]).not.toContain("—")
    expect(result[0]).toContain(",")
  })

  it("handles more variants than requested", () => {
    const input = "A\n===\nB\n===\nC"
    const result = splitVariants(input, 2)
    expect(result).toHaveLength(2)
  })

  it("handles fewer variants than requested", () => {
    const input = "Only one message here"
    const result = splitVariants(input, 3)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe("Only one message here")
  })
})
