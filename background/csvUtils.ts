import type { Contact, ContactStatus } from "./db"

export type CsvImportResult = {
  imported: number
  skipped: number
  updated: number
  errors: string[]
}

const VALID_STATUSES: ContactStatus[] = ["copied", "waiting", "replied", "dead"]

function normalizeStatus(raw: string | undefined): ContactStatus {
  if (!raw) return "copied"
  const lower = raw.trim().toLowerCase()
  if (VALID_STATUSES.includes(lower as ContactStatus)) return lower as ContactStatus
  return "copied"
}

function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
}

export type ParsedContact = Omit<Contact, "id" | "source" | "firstContactDate" | "lastContactDate"> & {
  dateContacted: string
}

export function validateCsvRows(rows: Record<string, string>[]): { valid: ParsedContact[]; skipped: number } {
  const valid: ParsedContact[] = []
  let skipped = 0

  for (const row of rows) {
    const name = row["name"]?.trim()
    const company = row["company"]?.trim()
    const linkedinUrl = row["linkedinUrl"]?.trim() || row["linkedinurl"]?.trim() || row["linkedin_url"]?.trim()
    const dateContacted = row["dateContacted"]?.trim() || row["datecontacted"]?.trim() || row["date_contacted"]?.trim()
    const status = row["status"]?.trim()

    if (!name || !company || !linkedinUrl || !dateContacted) {
      skipped++
      continue
    }

    valid.push({
      name,
      company,
      linkedinUrl,
      title: row["title"]?.trim() || "",
      dateContacted,
      status: normalizeStatus(status),
      notes: row["notes"]?.trim() || undefined,
    })
  }

  return { valid, skipped }
}

export function parseCsvText(text: string): Record<string, string>[] {
  const cleaned = stripBOM(text)
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ""
    })
    rows.push(row)
  }

  return rows
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ",") {
        fields.push(current)
        current = ""
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

export function contactsToCsv(contacts: (Contact & { interactionCount: number; latestNote: string })[]): string {
  const headers = ["name", "company", "title", "linkedinUrl", "firstContactDate", "lastContactDate", "status", "source", "interactionCount", "latestNote"]
  const lines = [headers.join(",")]

  for (const c of contacts) {
    const row = [
      escapeCsvField(c.name),
      escapeCsvField(c.company),
      escapeCsvField(c.title),
      escapeCsvField(c.linkedinUrl),
      c.firstContactDate,
      c.lastContactDate,
      c.status,
      c.source,
      String(c.interactionCount),
      escapeCsvField(c.latestNote || ""),
    ]
    lines.push(row.join(","))
  }

  return lines.join("\n")
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
