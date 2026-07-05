import { useState } from "react"

type Props = {
  variant: string
  index: number
  totalVariants: number
  onEdit: (index: number, text: string) => void
  onRate: (text: string, rating: "up" | "down") => void
}

export default function MessageOutput({ variant, index, totalVariants, onEdit, onRate }: Props) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(variant)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="lcmg-output">
      <div className="lcmg-output-header">
        <span className="lcmg-output-label">
          {totalVariants > 1 ? `Variant ${index + 1}` : "Generated Message"}
        </span>
        <div className="lcmg-output-actions">
          <button className="lcmg-thumb-btn" title="Like this style" onClick={() => onRate(variant, "up")}>{"👍"}</button>
          <button className="lcmg-thumb-btn" title="Dislike this style" onClick={() => onRate(variant, "down")}>{"👎"}</button>
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
      <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.35)", padding: "0 14px 10px" }}>
        {variant.trim().split(/\s+/).length} words
      </div>
    </div>
  )
}
