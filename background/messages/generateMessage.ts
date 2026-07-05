import type { PlasmoMessaging } from "@plasmohq/messaging"
import { callAI, loadAIConfig } from "../aiClient"

export type SenderInfo = {
  name: string
  school: string
  year: string
  status: string
  targetArea: string
  linkedinText?: string
  resumeText?: string
}

export type StyleExample = {
  text: string
  rating: "up" | "down"
  date: string
  context?: string
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
  selectedHook?: string
  messageType?: "cold" | "thank_you" | "follow_up" | "circle_back"
  variantCount?: number
  styleExamples?: StyleExample[]
}

export type GenerateMessageResponse = {
  variants?: string[]
  error?: string
  usage?: { inputTokens: number; outputTokens: number }
  styleExamplesUsed?: { liked: number; disliked: number }
}

function buildSystemPrompt(variantCount: number): string {
  return `You write cold LinkedIn outreach messages for people trying to break into or advance within investment banking.

CONTEXT:
Every message is sent by a student or early-career professional reaching out to an investment banker. The sender's background is provided. The recipient's profile is provided as raw page text.

GREETING RULE (non-negotiable):
Determine the recipient's seniority from their current title in the profile text.
- Analyst, Associate, Senior Associate, or no clear title: "Hi [First name]"
- Any Director-level title (Associate Director, Director, Executive Director, Senior Director), Vice President, SVP, VP, Managing Director, MD, Principal, Partner, Head of, Chief, President, Chairman, Founder, Co-Founder: "Hi Mr. [Last name]" or "Hi Ms. [Last name]"
- IMPORTANT: "Associate Director" is a Director-level title, use formal greeting. Do NOT confuse it with "Associate" (which is junior).
- When in doubt and the title is Director-level or above, always use the formal version.
- Do not guess gender from a name. If unclear, use first name rather than risk the wrong salutation.

STYLE RULES:
- Body length: 35-55 words, not counting greeting or sign-off. Shorter is better. If it feels long, cut.
- Structure: greeting, sender intro, hook + question (combine into 1-2 sentences), CTA, sign-off
- Sender intro: ONE short sentence. Keep it humble. Just school and year, maybe target area. Do NOT mention incoming offers, internships, or firm names in the intro. That comes off as bragging. Examples: "I'm a junior at Duke interested in M&A." / "I'm a sophomore at ACU exploring investment banking." / "I'm a senior at Penn State targeting restructuring."
- The hook and question should feel like one natural thought, not two separate paragraphs
- CTA: almost always "I'd love to chat if you have 10 minutes for a call" or a close variant. Keep it casual, not stiff.
- Sign-off: rotate through Best / Cheers / Sincerely, pick the one that fits the tone. Never use "Thanks" alone for a cold open (that's a follow-up sign-off). Then sender's name on the next line.
- The ENTIRE message after the greeting should read like a quick text, not an essay. If you can say it in fewer words, do.
- Never stack a multi-sentence self-intro before the hook. The hook and intro should feel interleaved, not stacked.

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
- The phrase "trying to get into investment banking" verbatim. Vary it: "interested in IB," "exploring banking," "targeting [specific group]," "aiming for a role in banking," etc.

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
2. If a specific hook detail is provided by the sender, use that as the hook angle
3. Shared interest or connection: something the sender and recipient both care about. A hobby, a club, a sport, a city, a school, an activity. This is the BEST hook. Keep it casual and human. One sentence max.
4. Simple question about their path: pick one small, interesting thing from their profile and ask about it. NOT a summary of their career. Just one thing you're curious about.

--- FEW-SHOT EXAMPLES ---

Example A (shared personal detail hook):
Hi Chris,

I'm a sophomore at ACU exploring investment banking. I saw you worked at Pine Cove, somewhere I went for years. I'd love to hear about how you got into banking if you have 10 minutes for a chat.

Cheers,
Jordan

---

Example B (referral hook):
Hi Mr. Mitchell,

I'm a sophomore at ACU studying finance. My close friend Mike Torres spoke with you recently and recommended I reach out. I've heard a little about the advisory work at Meridian Partners and it has me very interested. I'd love to chat if you have time for a short call.

Best,
Jordan

---

Example C (specific professional curiosity hook):
Hi Alex,

I'm a sophomore at ACU interested in investment banking. I saw you worked with the real estate group at Lazard and wondered if you worked on the Cofinimmo merger at all. I'd love to chat if you have 10 minutes for a phone call.

Sincerely,
Jordan

--- END EXAMPLES ---

OUTPUT FORMAT (non-negotiable):
Generate exactly ${variantCount} message variant${variantCount === 1 ? "" : "s"} using different hook angles. ${variantCount > 1 ? "Separate them with exactly this delimiter on its own line: ===" : ""}
Do not label them "Variant A" or "Variant B". Do not add any explanation. ${variantCount > 1 ? `Just the ${variantCount} messages separated by ===.` : "Just the message, nothing else."}`
}

const handler: PlasmoMessaging.MessageHandler<
  GenerateMessageRequest,
  GenerateMessageResponse
> = async (req, res) => {
  const {
    profile,
    rawProfileText,
    senderInfo,
    referralName,
    customInstructions,
    selectedHook,
    messageType,
    variantCount,
    styleExamples
  } = req.body

  const count = Math.min(Math.max(variantCount || 2, 1), 5)

  const config = await loadAIConfig()
  if (!config) {
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
    senderInfo.linkedinText
      ? `--- Sender's LinkedIn profile (use to find shared connections/interests with recipient) ---\n${senderInfo.linkedinText.slice(0, 4000)}`
      : "",
    senderInfo.resumeText
      ? `--- Sender's resume (use to find shared connections/interests with recipient) ---\n${senderInfo.resumeText.slice(0, 3000)}`
      : ""
  ]
    .filter(Boolean)
    .join("\n\n")

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

  const buildStyleSection = (): string => {
    if (!styleExamples || styleExamples.length === 0) return ""

    const liked = styleExamples
      .filter((e) => e.rating === "up")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2)
    const disliked = styleExamples
      .filter((e) => e.rating === "down")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2)

    if (liked.length === 0 && disliked.length === 0) return ""

    let section = "\n=== STYLE PREFERENCE ===\nThe sender has rated previous messages to indicate their preferences.\n"

    if (liked.length > 0) {
      section += "\nMESSAGES THE SENDER LIKED (write more like these):\n"
      liked.forEach((ex, i) => {
        section += `--- Liked ${i + 1} ---\n${ex.text}\n${ex.context ? `Sender's note: "${ex.context}"\n` : "(no note provided)\n"}`
      })
    }

    if (disliked.length > 0) {
      section += "\nMESSAGES THE SENDER DISLIKED (avoid this style):\n"
      disliked.forEach((ex, i) => {
        section += `--- Disliked ${i + 1} ---\n${ex.text}\n${ex.context ? `Sender's note: "${ex.context}"\n` : "(no note provided)\n"}`
      })
    }

    section += "\nMatch the tone and approach of the liked messages. Avoid the patterns seen in the disliked messages.\n=== END STYLE PREFERENCE ==="
    return section
  }

  const likedCount = styleExamples ? styleExamples.filter((e) => e.rating === "up").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2).length : 0
  const dislikedCount = styleExamples ? styleExamples.filter((e) => e.rating === "down").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2).length : 0
  const styleExamplesUsed = likedCount > 0 || dislikedCount > 0 ? { liked: likedCount, disliked: dislikedCount } : undefined

  const userPrompt = `${senderBlock}

${recipientBlock}

${referralName ? `Referral: ${referralName} suggested the sender reach out. Use this as the opening hook for ${count === 1 ? "the message" : "ALL variants"}.` : ""}
${selectedHook ? `Prioritize this detail as the hook angle for Variant 1: ${selectedHook}.${count > 1 ? " Use different hooks for other variants." : ""}` : ""}
${customInstructions ? `Extra context from sender: ${customInstructions}` : ""}
${messageType === "thank_you" ? 'MESSAGE TYPE: Post-call thank you. Write a SHORT follow-up (2-3 sentences max). Reference something specific they discussed (make it plausible based on profile). Warm, grateful tone. Sign off with "Thanks" or "Thank you". Do NOT include a CTA asking for another call.' : ""}
${messageType === "follow_up" ? "MESSAGE TYPE: No-response follow-up. The sender already reached out and got no reply. Write a VERY short message (2 sentences max). Light, not passive-aggressive. Mention you reached out before, give one brief new reason to connect or a fresh angle. Keep it casual." : ""}
${messageType === "circle_back" ? "MESSAGE TYPE: Circling back after time has passed. The sender connected with this person a while ago. Write a brief message referencing that they spoke before, provide a new reason to reconnect (a new question, an update on the sender's progress, or a relevant development). 2-3 sentences. Warm but brief." : ""}

${buildStyleSection()}

${count > 1 ? `Write ${count} message variants separated by ===.` : "Write one message."}`

  try {
    const maxTokens = count <= 2 ? 600 : 300 * count
    const result = await callAI(config, buildSystemPrompt(count), userPrompt, maxTokens)

    const cleaned = result.text.replace(/—/g, ",").replace(/–/g, "-").replace(/--/g, ",")

    const variants = cleaned
      .split(/\n===\n|^===$/m)
      .map((v) => v.trim())
      .filter(Boolean)

    if (variants.length >= count) {
      res.send({ variants: variants.slice(0, count), usage: result.usage, styleExamplesUsed })
    } else {
      res.send({
        variants: variants.length > 0 ? variants : [cleaned.trim()],
        usage: result.usage,
        styleExamplesUsed
      })
    }
  } catch (err) {
    res.send({ error: err instanceof Error ? err.message : "Network error" })
  }
}

export default handler
