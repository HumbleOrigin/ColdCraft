import type { PlasmoMessaging } from "@plasmohq/messaging"

export type SenderInfo = {
  name: string
  school: string
  year: string
  status: string
  targetArea: string
  linkedinText?: string
  resumeText?: string
}

export type GenerateMessageRequest = {
  profile: {
    name: string
    title: string
    company: string
    location: string
    about: string
    skills: string[]
    experience: Array<{ title: string; company: string; duration: string }>
    education: { institution: string; degree: string; endYear?: number }
  }
  rawProfileText?: string
  senderInfo?: SenderInfo
  referralName?: string
  customInstructions?: string
}

export type GenerateMessageResponse = {
  message?: string
  error?: string
}

const SYSTEM_PROMPT = `You write cold LinkedIn outreach messages for people trying to break into or advance within investment banking.

CONTEXT:
Every message is sent by a student or early-career professional reaching out to an investment banker. The sender's background is provided. The recipient's profile is provided as raw page text.

GREETING RULE (non-negotiable):
Determine the recipient's seniority from their current title in the profile text.
- Analyst, Associate, Senior Associate, or no clear title: "Hi [First name]"
- Vice President, VP, Director, Executive Director, Managing Director, MD, Principal, Partner, Head of, Chief, President, Chairman, Founder, Co-Founder: "Hi Mr. [Last name]" or "Hi Ms. [Last name]"
- When in doubt and the title is VP-level or above, always use the formal version.
- Do not guess gender from a name. If unclear, use first name rather than risk the wrong salutation.

STYLE RULES:
- Body length: 35-55 words, not counting greeting or sign-off. Shorter is better. If it feels long, cut.
- Structure: greeting, sender intro, hook + question (combine into 1-2 sentences), CTA, sign-off
- Sender intro: ONE short sentence. Keep it humble. Just school and year, maybe target area. Do NOT mention incoming offers, internships, or firm names in the intro. That comes off as bragging. Examples: "I'm a junior at Duke interested in M&A." / "I'm a sophomore at ACU exploring investment banking." / "I'm a senior at Penn State targeting restructuring."
- The hook and question should feel like one natural thought, not two separate paragraphs
- CTA: a brief call ask. Keep it casual, not stiff.
- Sign-off: Best / Cheers / Sincerely, then sender's name on the next line
- The ENTIRE message after the greeting should read like a quick text, not an essay. If you can say it in fewer words, do.

SENDER VS RECIPIENT (critical):
The sender's intro uses ONLY their own name, school, year, and status from the sender block.
Never borrow the recipient's school, firm, or background to describe the sender.

BANNED:
- Em dashes of any kind (-- or the em dash character). Use a comma or period instead.
- "I hope this message finds you well"
- "I'd love to pick your brain"
- "I'd love to learn from you"
- "I came across your profile"
- "I noticed you work at"
- Vague flattery of any kind
- Mentioning the sender's incoming offers, internships, or firm placements. It sounds like bragging. The sender is reaching out to learn, not to flex.
- Buzzwords and jargon: "origination", "capital markets ecosystem", "deal execution", "client-facing", "strategic advisory". Write like a normal person.

REQUIRED:
- One specific, small detail from their profile: a club, a hobby, a city, a move they made, an interest you share. NOT a paragraph summarizing their career.
- The question must sound like a real person talking, not a cover letter.

QUESTION TONE (critical):
Write like a 20-year-old texting, not a consultant writing a memo.
Bad: "I'm curious how your credit underwriting background shaped your approach to origination and investor relationships on the placement side."
Bad: "Seeing that you've spent over a decade leading APAC economics out of Tokyo caught my attention, especially coming from a fixed income strategy background across multiple firms."
Good: "Was the move from credit to placements something you planned, or did it just happen?"
Good: "I saw you're into hiking too. How's the trail scene in Charlotte?"
Good: "Did you always know you wanted to do restructuring, or did you fall into it?"
One sentence. Simple words. Genuine curiosity. No career summaries.

HOOK PRIORITY (evaluate in this exact order, use the first that applies):
1. Referral: if a referral name is provided, lead with "[Name] suggested I reach out"
2. Shared interest or connection: something the sender and recipient both care about. A hobby, a club, a sport, a city, a school, an activity. This is the BEST hook. Keep it casual and human. One sentence max.
3. Simple question about their path: pick one small, interesting thing from their profile and ask about it. NOT a summary of their career. Just one thing you're curious about.

OUTPUT: Write only the message. No subject line. No explanation. No markdown.`

const handler: PlasmoMessaging.MessageHandler<
  GenerateMessageRequest,
  GenerateMessageResponse
> = async (req, res) => {
  const { profile, rawProfileText, senderInfo, referralName, customInstructions } = req.body

  const result = await chrome.storage.sync.get("anthropic_api_key")
  const apiKey = result.anthropic_api_key
  if (!apiKey) {
    res.send({ error: "NO_API_KEY" })
    return
  }

  if (!senderInfo?.name) {
    res.send({ error: "NO_SENDER_NAME" })
    return
  }

  const senderIntro = `Name: ${senderInfo.name}
School and year: ${senderInfo.year} at ${senderInfo.school}
Status: ${senderInfo.status}
Target area: ${senderInfo.targetArea}`

  const senderContext = [
    senderInfo.linkedinText ? `--- Sender's LinkedIn profile (use to find shared connections/interests with recipient) ---\n${senderInfo.linkedinText.slice(0, 4000)}` : "",
    senderInfo.resumeText ? `--- Sender's resume (use to find shared connections/interests with recipient) ---\n${senderInfo.resumeText.slice(0, 3000)}` : ""
  ].filter(Boolean).join("\n\n")

  const senderBlock = `=== WHO IS WRITING THIS MESSAGE ===
${senderIntro}

Use ONLY the sender's name, school, year, and status for the intro line. Do not pull anything from the recipient's profile to describe the sender.
${senderContext ? `\nThe following is additional background on the sender. Use it ONLY to find genuine shared connections, interests, or experiences with the recipient for the hook. Never mention these details in the intro line.\n\n${senderContext}` : ""}`

  const recipientBlock = rawProfileText
    ? `=== WHO THE MESSAGE IS BEING SENT TO ===
(Raw LinkedIn page text. Extract name, current title, firm, career history, and any hook-worthy details from this.)
---
${rawProfileText}
---`
    : `=== WHO THE MESSAGE IS BEING SENT TO ===
Name: ${profile.name}
Title: ${profile.title} at ${profile.company}
Location: ${profile.location}
About: ${profile.about}
Experience: ${profile.experience.map((e) => `${e.title} at ${e.company}${e.duration ? ` (${e.duration})` : ""}`).join("; ")}
Education: ${profile.education?.institution ? `${profile.education.degree} at ${profile.education.institution}` : ""}`

  const userPrompt = `${senderBlock}

${recipientBlock}

${referralName ? `Referral: ${referralName} suggested the sender reach out. Use this as the opening hook.` : ""}
${customInstructions ? `Extra context from sender: ${customInstructions}` : ""}

Write the message.`

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
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      res.send({ error: errorData?.error?.message || `API error: ${response.status}` })
      return
    }

    const data = await response.json()
    const text: string = data.content?.[0]?.text || ""
    // Strip any em dashes that slipped through
    const cleaned = text.replace(/—/g, ",").replace(/–/g, "-").replace(/--/g, ",")
    res.send({ message: cleaned })
  } catch (err) {
    res.send({ error: err instanceof Error ? err.message : "Network error" })
  }
}

export default handler
