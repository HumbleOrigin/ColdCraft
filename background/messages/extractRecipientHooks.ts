import type { PlasmoMessaging } from "@plasmohq/messaging"
import { callAI, loadAIConfig } from "../aiClient"

export type ExtractRecipientHooksRequest = {
  rawProfileText: string
}

export type ExtractRecipientHooksResponse = {
  hookDetails?: string[]
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<
  ExtractRecipientHooksRequest,
  ExtractRecipientHooksResponse
> = async (req, res) => {
  const { rawProfileText } = req.body

  const config = await loadAIConfig()
  if (!config) {
    res.send({ error: "NO_API_KEY" })
    return
  }

  const prompt = `From this LinkedIn profile, extract 3-5 hook-worthy details that a cold outreach sender could reference to make a message feel personal and specific. Return ONLY a JSON array of short strings. Each string should be a single concrete detail: a shared school, a hobby or sport, a volunteer role, a city, an interesting career move, a club, or a specific deal/project.

Bad examples (too vague): "works in finance", "has experience in banking", "based in New York"
Good examples: "played lacrosse at Duke", "volunteer at Habitat for Humanity", "moved from consulting to IB", "based in Charlotte", "Columbia MBA", "worked on a real estate merger at Lazard"

Profile text:
---
${rawProfileText.slice(0, 5000)}
---

Return JSON like: ["detail 1", "detail 2", "detail 3"]`

  try {
    const result = await callAI(
      config,
      "You extract concise, hook-worthy details from LinkedIn profiles and return only a JSON array.",
      prompt,
      200
    )

    const jsonMatch = result.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      res.send({ hookDetails: [] })
      return
    }

    const parsed = JSON.parse(jsonMatch[0])
    if (Array.isArray(parsed)) {
      res.send({ hookDetails: parsed.slice(0, 5).filter((s: unknown) => typeof s === "string") })
    } else {
      res.send({ hookDetails: [] })
    }
  } catch {
    res.send({ hookDetails: [] })
  }
}

export default handler
