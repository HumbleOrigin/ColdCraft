import type { PlasmoMessaging } from "@plasmohq/messaging"
import { callAI, loadAIConfig } from "../aiClient"
import { sanitizeProfileText } from "../sanitize"
import type { SenderInfo } from "./generateMessage"

export type ExtractSenderProfileRequest = {
  pageText: string
}

export type ExtractSenderProfileResponse = {
  senderInfo?: Partial<SenderInfo>
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<
  ExtractSenderProfileRequest,
  ExtractSenderProfileResponse
> = async (req, res) => {
  const { pageText } = req.body
  const cleanedText = sanitizeProfileText(pageText.slice(0, 4000))

  const config = await loadAIConfig()
  if (!config) {
    res.send({ error: "NO_API_KEY" })
    return
  }

  const prompt = `Extract the following fields from this LinkedIn profile page text. Return ONLY valid JSON, nothing else.

Fields to extract:
- name: full name of the person
- school: most recent university/college name (just the institution name, no degree)
- year: infer academic year from graduation date vs today (${new Date().getFullYear()}). Options: "Freshman", "Sophomore", "Junior", "Senior", "Recent grad", "MBA1", "MBA2", or blank if not a student
- currentRole: their current job title and company as a single string, e.g. "Investment Banking Analyst at Goldman Sachs". Leave blank if none or if they are a student with no role.

Page text:
---
${cleanedText}
---

Return JSON like: {"name":"...","school":"...","year":"...","currentRole":"..."}`

  try {
    const result = await callAI(
      config,
      "You extract structured data from text and return only valid JSON.",
      prompt,
      200
    )

    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.send({ error: "Could not parse profile data" })
      return
    }

    const parsed = JSON.parse(jsonMatch[0])
    res.send({
      senderInfo: {
        name: parsed.name || "",
        school: parsed.school || "",
        year: parsed.year || "",
        status: parsed.currentRole || "",
        targetArea: ""
      }
    })
  } catch (err) {
    res.send({ error: err instanceof Error ? err.message : "Network error" })
  }
}

export default handler
