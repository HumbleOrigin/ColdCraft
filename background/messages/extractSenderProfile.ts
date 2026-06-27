import type { PlasmoMessaging } from "@plasmohq/messaging"
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

  const result = await chrome.storage.sync.get("anthropic_api_key")
  const apiKey = result.anthropic_api_key
  if (!apiKey) {
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
${pageText.slice(0, 4000)}
---

Return JSON like: {"name":"...","school":"...","year":"...","currentRole":"..."}`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }]
      })
    })

    if (!response.ok) {
      res.send({ error: `API error: ${response.status}` })
      return
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ""

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
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
