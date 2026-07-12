import type { PlasmoMessaging } from "@plasmohq/messaging"
import { upsertContact } from "../db"
import { parseCsvText, validateCsvRows } from "../csvUtils"
import type { CsvImportResult } from "../csvUtils"

export type ImportContactsRequest = { csvText: string }
export type ImportContactsResponse = CsvImportResult

const handler: PlasmoMessaging.MessageHandler<ImportContactsRequest, ImportContactsResponse> = async (req, res) => {
  try {
    const rows = parseCsvText(req.body!.csvText)
    const { valid, skipped } = validateCsvRows(rows)

    let imported = 0
    let updated = 0
    const errors: string[] = []

    for (const contact of valid) {
      try {
        await upsertContact({
          name: contact.name,
          linkedinUrl: contact.linkedinUrl,
          company: contact.company,
          title: contact.title,
          firstContactDate: contact.dateContacted,
          lastContactDate: contact.dateContacted,
          status: contact.status,
          source: "manual",
          notes: contact.notes,
        })
        imported++
      } catch (err: any) {
        if (err?.message?.includes("Contact not found")) {
          errors.push(`Failed to import ${contact.name}`)
        } else {
          imported++
        }
      }
    }

    res.send({ imported, skipped, updated, errors })
  } catch (err: any) {
    res.send({ imported: 0, skipped: 0, updated: 0, errors: [err?.message || "Import failed"] })
  }
}

export default handler
