import { describe, expect, it } from "vitest"
import { buildMessageTypeInstruction } from "../background/messages/generateMessage"

describe("buildMessageTypeInstruction", () => {
  it("returns empty string for cold outreach", () => {
    expect(buildMessageTypeInstruction("cold")).toBe("")
    expect(buildMessageTypeInstruction(undefined)).toBe("")
  })

  it("includes the sender's notes for thank-you messages", () => {
    const result = buildMessageTypeInstruction("thank_you", "We discussed his move from S&T to M&A")
    expect(result).toContain("We discussed his move from S&T to M&A")
    expect(result).toContain("Never invent")
  })

  it("forbids inventing details when no notes are provided", () => {
    for (const type of ["thank_you", "follow_up", "circle_back"] as const) {
      const result = buildMessageTypeInstruction(type)
      expect(result).toContain("Do NOT invent")
      expect(result).not.toContain("make it plausible")
    }
  })

  it("includes notes block for follow-up and circle-back when provided", () => {
    for (const type of ["follow_up", "circle_back"] as const) {
      const result = buildMessageTypeInstruction(type, "I reached out two weeks ago")
      expect(result).toContain("I reached out two weeks ago")
      expect(result).toContain("Never invent")
    }
  })
})
