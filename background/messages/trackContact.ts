import type { PlasmoMessaging } from "@plasmohq/messaging"
import { upsertContact, addInteraction } from "../db"

export type TrackContactRequest = {
  linkedinUrl: string
  name: string
  company: string
  title: string
  messageText: string
  messageType: string
}

export type TrackContactResponse = {
  success: boolean
  contactId?: number
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<TrackContactRequest, TrackContactResponse> = async (req, res) => {
  try {
    const { linkedinUrl, name, company, title, messageText, messageType } = req.body!
    const now = new Date().toISOString()

    const contactId = await upsertContact({
      name,
      linkedinUrl,
      company,
      title,
      firstContactDate: now,
      lastContactDate: now,
      status: "copied",
      source: "coldcraft",
    })

    await addInteraction({
      contactId,
      messageText,
      messageType,
      date: now,
    })

    res.send({ success: true, contactId })
  } catch (err: any) {
    res.send({ success: false, error: err?.message || "Failed to track contact" })
  }
}

export default handler
