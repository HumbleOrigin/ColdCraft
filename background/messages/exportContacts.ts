import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getAllContacts, getInteractionsForContact } from "../db"
import { contactsToCsv } from "../csvUtils"

export type ExportContactsRequest = {}
export type ExportContactsResponse = { csv?: string; error?: string }

const handler: PlasmoMessaging.MessageHandler<ExportContactsRequest, ExportContactsResponse> = async (_req, res) => {
  try {
    const contacts = await getAllContacts()
    const enriched = await Promise.all(
      contacts.map(async (c) => {
        const interactions = c.id !== undefined ? await getInteractionsForContact(c.id) : []
        const latestNote = interactions
          .filter((i) => i.notes)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.notes || ""
        return { ...c, interactionCount: interactions.length, latestNote }
      })
    )
    res.send({ csv: contactsToCsv(enriched) })
  } catch (err: any) {
    res.send({ error: err?.message || "Export failed" })
  }
}

export default handler
