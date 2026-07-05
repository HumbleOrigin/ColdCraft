const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
  /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi,
  /you\s+are\s+now\s+/gi,
  /new\s+instructions?:/gi,
  /system\s*:\s*/gi,
  /\bdo\s+not\s+follow\b/gi,
  /\boverride\b.*\b(instructions?|rules?|prompts?)\b/gi,
  /\breturn\b.*\b(api[_ ]?key|secret|password|credential)\b/gi,
  /\boutput\b.*\b(api[_ ]?key|secret|password|credential)\b/gi,
  /\brepeat\b.*\b(system|prompt|instructions?)\b/gi,
]

export function sanitizeProfileText(text: string): string {
  let cleaned = text
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[removed]")
  }
  return cleaned
}
