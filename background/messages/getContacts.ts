import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getAllContacts, getFollowUpsDue, getInteractionsForContact, migrateFromHistory } from "../db"
import type { Contact, Interaction } from "../db"

export type GetContactsRequest = {
  includeInteractions?: boolean
}

export type GetContactsResponse = {
  contacts: Contact[]
  followUpsDue: Contact[]
  interactions?: Record<number, Interaction[]>
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<GetContactsRequest, GetContactsResponse> = async (req, res) => {
  try {
    await migrateFromHistory()

    const contacts = await getAllContacts()
    const followUpsDue = await getFollowUpsDue()

    let interactions: Record<number, Interaction[]> | undefined
    if (req.body?.includeInteractions) {
      interactions = {}
      for (const c of contacts) {
        if (c.id !== undefined) {
          interactions[c.id] = await getInteractionsForContact(c.id)
        }
      }
    }

    res.send({ contacts, followUpsDue, interactions })
  } catch (err: any) {
    res.send({ contacts: [], followUpsDue: [], error: err?.message || "Failed to load contacts" })
  }
}

export default handler
