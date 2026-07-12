import { useState } from "react"

type ConfidenceCheck = { label: string; pass: boolean; warn?: boolean }

function countBodyWords(msg: string): number {
  const lines = msg.split("\n").filter(Boolean)
  const withoutFirst = lines.slice(1)
  const lastLine = withoutFirst[withoutFirst.length - 1] ?? ""
  const isSignOff = /^(best|cheers|sincerely|regards|thanks)/i.test(lastLine.trim())
  const body = isSignOff ? withoutFirst.slice(0, -2) : withoutFirst
  return body.join(" ").trim().split(/\s+/).filter(Boolean).length
}

function getConfidenceChecks(msg: string): ConfidenceCheck[] {
  const words = countBodyWords(msg)
  const hasQuestion = /\?/.test(msg)
  const hasGeneric = /trying to get into investment banking/i.test(msg)
  const hasCTA = /chat|call|phone|conversation|connect/i.test(msg)

  return [
    { label: `${words} words (target: 35–55)`, pass: words >= 35 && words <= 55, warn: words > 55 || words < 35 },
    { label: "Contains a question", pass: hasQuestion },
    { label: "Has a clear CTA", pass: hasCTA },
    { label: 'Avoids generic "trying to get into IB"', pass: !hasGeneric, warn: hasGeneric }
  ]
}

type Props = {
  variant: string
  index: number
  totalVariants: number
  charLimit: number | null
  styleTrainingEnabled: boolean
  rating?: "up" | "down"
  ratingContext: string
  libraryFull: boolean
  onEdit: (index: number, text: string) => void
  onRate: (index: number, rating: "up" | "down") => void
  onContextChange: (index: number, context: string) => void
  onContextCommit: (index: number) => void
  onCopy?: (variant: string) => void
}

export default function MessageOutput({
  variant, index, totalVariants, charLimit, styleTrainingEnabled,
  rating, ratingContext, libraryFull,
  onEdit, onRate, onContextChange, onContextCommit, onCopy
}: Props) {
  const [copied, setCopied] = useState(false)
  const [showChecks, setShowChecks] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(variant)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.(variant)
  }

  const charCount = variant.length
  const overLimit = charLimit !== null && charCount > charLimit
  const checks = getConfidenceChecks(variant)
  const allPass = checks.every((c) => c.pass)
  const hasWarning = checks.some((c) => c.warn)

  return (
    <div className="lcmg-output">
      <div className="lcmg-output-header">
        <span className="lcmg-output-label">
          {totalVariants > 1 ? `Variant ${index + 1}` : "Generated Message"}
        </span>
        <div className="lcmg-output-actions">
          {styleTrainingEnabled && (
            <div style={{ display: "flex", gap: 2, marginRight: 4 }}>
              <button
                className={`lcmg-rate-btn${rating === "up" ? " active-up" : ""}`}
                onClick={() => onRate(index, "up")}
                aria-label="Good message"
                title="More like this">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 22V11L2 11V22H7ZM7 11L11.586 3.586C11.961 3.211 12.469 3 13 3H13.172C13.702 3 14.211 3.211 14.586 3.586L15 4V9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V13.126C22 13.4395 21.9386 13.7501 21.819 14.039L19.202 19.9545C19.0723 20.2619 18.6667 21 18 21H7" />
                </svg>
              </button>
              <button
                className={`lcmg-rate-btn${rating === "down" ? " active-down" : ""}`}
                onClick={() => onRate(index, "down")}
                aria-label="Bad message"
                title="Less like this">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 2V13H22V2H17ZM17 13L12.414 20.414C12.039 20.789 11.531 21 11 21H10.828C10.298 21 9.789 20.789 9.414 20.414L9 20V15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V10.874C2 10.5605 2.0614 10.2499 2.181 9.961L4.798 4.0455C4.928 3.738 5.333 3 6 3H17" />
                </svg>
              </button>
            </div>
          )}
          {copied ? (
            <span className="lcmg-copied-badge">{"✓"} Copied!</span>
          ) : (
            <button className="lcmg-btn-ghost" onClick={copyToClipboard}>Copy</button>
          )}
        </div>
      </div>
      <textarea
        className="lcmg-output-textarea"
        value={variant}
        onChange={(e) => onEdit(index, e.target.value)}
        rows={8}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 11, color: "rgba(255,255,255,0.35)", padding: "0 14px 10px" }}>
        <button
          className="lcmg-confidence-toggle"
          onClick={() => setShowChecks(!showChecks)}
          aria-expanded={showChecks}>
          {allPass ? "✓ checks" : hasWarning ? "⚠ checks" : "✗ checks"} {showChecks ? "▲" : "▼"}
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <span>{variant.trim().split(/\s+/).length} words</span>
          <span style={overLimit ? { color: "#FF8080", fontWeight: 600 } : undefined}>
            {charLimit !== null ? `${charCount}/${charLimit} chars` : `${charCount} chars`}
          </span>
        </div>
      </div>
      {showChecks && (
        <div className="lcmg-confidence-list" style={{ padding: "0 14px 10px" }}>
          {checks.map((c) => (
            <div key={c.label} className={`lcmg-confidence-item ${c.warn ? "warn" : c.pass ? "pass" : "fail"}`}>
              <span>{c.warn ? "⚠" : c.pass ? "✓" : "✗"}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      )}
      {overLimit && (
        <div style={{ fontSize: 10.5, color: "#FF8080", padding: "0 14px 10px", lineHeight: 1.4 }}>
          Too long for a LinkedIn connection note ({charLimit} char limit). Trim it or send as a regular message.
        </div>
      )}
      {styleTrainingEnabled && !rating && libraryFull && (
        <div className="lcmg-cap-warning" style={{ padding: "0 14px 10px" }}>
          Training library full (10/10). Remove an example in Training Data before adding more.
        </div>
      )}
      {rating && (
        <div style={{ padding: "0 14px 12px" }}>
          <input
            className="lcmg-context-input"
            placeholder={rating === "up" ? "What did you like? (optional)" : "What would you change? (optional)"}
            value={ratingContext}
            onChange={(e) => onContextChange(index, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur()
            }}
            onBlur={() => onContextCommit(index)}
          />
        </div>
      )}
    </div>
  )
}
