import { describe, it, expect } from "vitest"
import { parseCsvText, validateCsvRows, contactsToCsv } from "../background/csvUtils"

describe("parseCsvText", () => {
  it("parses a simple CSV", () => {
    const csv = `name,company,linkedinUrl,dateContacted,status
John Doe,Goldman Sachs,https://linkedin.com/in/john,2026-07-01,waiting`
    const rows = parseCsvText(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe("John Doe")
    expect(rows[0].company).toBe("Goldman Sachs")
  })

  it("handles quoted fields with commas", () => {
    const csv = `name,company,linkedinUrl,dateContacted,status
"Jane Smith","Goldman Sachs Group, Inc.",https://linkedin.com/in/jane,2026-07-01,copied`
    const rows = parseCsvText(csv)
    expect(rows[0].company).toBe("Goldman Sachs Group, Inc.")
  })

  it("handles escaped quotes", () => {
    const csv = `name,company,linkedinUrl,dateContacted,status
"John ""JD"" Doe",GS,https://linkedin.com/in/john,2026-07-01,waiting`
    const rows = parseCsvText(csv)
    expect(rows[0].name).toBe('John "JD" Doe')
  })

  it("strips BOM", () => {
    const csv = `﻿name,company,linkedinUrl,dateContacted,status
Test,Co,https://linkedin.com/in/test,2026-07-01,copied`
    const rows = parseCsvText(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe("Test")
  })

  it("ignores empty lines", () => {
    const csv = `name,company,linkedinUrl,dateContacted,status

John,GS,https://linkedin.com/in/john,2026-07-01,waiting

`
    const rows = parseCsvText(csv)
    expect(rows).toHaveLength(1)
  })

  it("returns empty array for header-only CSV", () => {
    const csv = `name,company,linkedinUrl,dateContacted,status`
    const rows = parseCsvText(csv)
    expect(rows).toHaveLength(0)
  })
})

describe("validateCsvRows", () => {
  it("validates rows with all required columns", () => {
    const rows = [
      { name: "John", company: "GS", linkedinUrl: "https://linkedin.com/in/john", dateContacted: "2026-07-01", status: "waiting" }
    ]
    const { valid, skipped } = validateCsvRows(rows)
    expect(valid).toHaveLength(1)
    expect(skipped).toBe(0)
  })

  it("skips rows missing required columns", () => {
    const rows = [
      { name: "John", company: "", linkedinUrl: "https://linkedin.com/in/john", dateContacted: "2026-07-01", status: "waiting" },
      { name: "", company: "GS", linkedinUrl: "https://linkedin.com/in/john", dateContacted: "2026-07-01", status: "waiting" },
      { name: "Jane", company: "JPM", linkedinUrl: "", dateContacted: "2026-07-01", status: "copied" },
      { name: "Bob", company: "MS", linkedinUrl: "https://linkedin.com/in/bob", dateContacted: "", status: "copied" },
    ]
    const { valid, skipped } = validateCsvRows(rows)
    expect(valid).toHaveLength(0)
    expect(skipped).toBe(4)
  })

  it("normalizes status values", () => {
    const rows = [
      { name: "A", company: "Co", linkedinUrl: "https://linkedin.com/in/a", dateContacted: "2026-07-01", status: "Waiting" },
      { name: "B", company: "Co", linkedinUrl: "https://linkedin.com/in/b", dateContacted: "2026-07-01", status: "REPLIED" },
      { name: "C", company: "Co", linkedinUrl: "https://linkedin.com/in/c", dateContacted: "2026-07-01", status: "invalid" },
      { name: "D", company: "Co", linkedinUrl: "https://linkedin.com/in/d", dateContacted: "2026-07-01", status: "" },
    ]
    const { valid } = validateCsvRows(rows)
    expect(valid[0].status).toBe("waiting")
    expect(valid[1].status).toBe("replied")
    expect(valid[2].status).toBe("copied")
    expect(valid[3].status).toBe("copied")
  })

  it("preserves optional fields", () => {
    const rows = [
      { name: "John", company: "GS", linkedinUrl: "https://linkedin.com/in/john", dateContacted: "2026-07-01", status: "copied", title: "VP, M&A", notes: "Met at info session" }
    ]
    const { valid } = validateCsvRows(rows)
    expect(valid[0].title).toBe("VP, M&A")
    expect(valid[0].notes).toBe("Met at info session")
  })

  it("handles case-insensitive column names", () => {
    const rows = [
      { name: "John", company: "GS", linkedinurl: "https://linkedin.com/in/john", datecontacted: "2026-07-01", status: "copied" }
    ]
    const { valid } = validateCsvRows(rows)
    expect(valid).toHaveLength(1)
  })

  it("ignores extra columns", () => {
    const rows = [
      { name: "John", company: "GS", linkedinUrl: "https://linkedin.com/in/john", dateContacted: "2026-07-01", status: "copied", extraCol: "ignore" }
    ]
    const { valid } = validateCsvRows(rows)
    expect(valid).toHaveLength(1)
  })
})

describe("contactsToCsv", () => {
  it("generates valid CSV with headers", () => {
    const csv = contactsToCsv([
      { id: 1, name: "John", company: "Goldman Sachs Group, Inc.", title: "VP", linkedinUrl: "https://linkedin.com/in/john", firstContactDate: "2026-07-01", lastContactDate: "2026-07-05", status: "waiting", source: "coldcraft", interactionCount: 3, latestNote: "" }
    ])
    const lines = csv.split("\n")
    expect(lines[0]).toBe("name,company,title,linkedinUrl,firstContactDate,lastContactDate,status,source,interactionCount,latestNote")
    expect(lines[1]).toContain('"Goldman Sachs Group, Inc."')
  })
})
