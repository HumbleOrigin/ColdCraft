import type { PlasmoMessaging } from "@plasmohq/messaging"
import { deleteContact } from "../db"

export type DeleteContactRequest = { id: number }
export type DeleteContactResponse = { success: boolean; error?: string }

const handler: PlasmoMessaging.MessageHandler<DeleteContactRequest, DeleteContactResponse> = async (req, res) => {
  try {
    await deleteContact(req.body!.id)
    res.send({ success: true })
  } catch (err: any) {
    res.send({ success: false, error: err?.message || "Failed to delete contact" })
  }
}

export default handler
