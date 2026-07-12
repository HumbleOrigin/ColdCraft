import type { PlasmoMessaging } from "@plasmohq/messaging"
import { updateContactStatus, updateContact } from "../db"
import type { ContactStatus } from "../db"

export type UpdateContactRequest = {
  id: number
  status?: ContactStatus
  name?: string
  company?: string
  title?: string
  notes?: string
}

export type UpdateContactResponse = {
  success: boolean
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<UpdateContactRequest, UpdateContactResponse> = async (req, res) => {
  try {
    const { id, status, ...updates } = req.body!

    if (status) {
      await updateContactStatus(id, status)
    }

    const fieldUpdates: Record<string, string> = {}
    if (updates.name !== undefined) fieldUpdates.name = updates.name
    if (updates.company !== undefined) fieldUpdates.company = updates.company
    if (updates.title !== undefined) fieldUpdates.title = updates.title
    if (updates.notes !== undefined) fieldUpdates.notes = updates.notes

    if (Object.keys(fieldUpdates).length > 0) {
      await updateContact(id, fieldUpdates)
    }

    res.send({ success: true })
  } catch (err: any) {
    res.send({ success: false, error: err?.message || "Failed to update contact" })
  }
}

export default handler
