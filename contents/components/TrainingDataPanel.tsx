import { useRef, useState } from "react"
import type { StyleExample } from "../../background/messages/generateMessage"

type HistoryEntry = { text: string; date: string; recipientName: string }

type Props = {
  open: boolean
  onClose: () => void
  styleExamples: StyleExample[]
  onUpdateExamples: (examples: StyleExample[]) => void
  styleTrainingEnabled: boolean
  onToggleTraining: (enabled: boolean) => void
  history: HistoryEntry[]
  onReplaceHistory: (history: HistoryEntry[]) => void
}

export default function TrainingDataPanel({
  open, onClose, styleExamples, onUpdateExamples,
  styleTrainingEnabled, onToggleTraining, history, onReplaceHistory
}: Props) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null)
  const [editingNoteValue, setEditingNoteValue] = useState("")
  const [exportConfirm, setExportConfirm] = useState(false)
  const [fileImportError, setFileImportError] = useState("")
  const [importPreview, setImportPreview] = useState<{ examples: StyleExample[]; history: HistoryEntry[]; enabled: boolean } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const persist = (updated: StyleExample[]) => {
    onUpdateExamples(updated)
    chrome.storage.local.set({ style_examples: updated })
  }

  const exportData = async () => {
    const data = await chrome.storage.local.get(["style_examples", "style_training_enabled", "message_history"])
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      styleTrainingEnabled: !!data.style_training_enabled,
      styleExamples: data.style_examples || [],
      messageHistory: data.message_history || []
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `coldcraft-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportConfirm(true)
    setTimeout(() => setExportConfirm(false), 2000)
  }

  const handleImportFile = (file: File) => {
    setFileImportError("")
    file.text().then((text) => {
      try {
        const data = JSON.parse(text)
        if (data.version !== 1) throw new Error("Unsupported version")
        if (!Array.isArray(data.styleExamples)) throw new Error("Invalid format")
        if (!Array.isArray(data.messageHistory)) throw new Error("Invalid format")
        for (const ex of data.styleExamples) {
          if (typeof ex.text !== "string" || !["up", "down"].includes(ex.rating)) throw new Error("Invalid style example")
        }
        // Older backups (pre-1.1) used `messageSent` for the history text field
        const normalizedHistory: HistoryEntry[] = data.messageHistory.map((entry: Record<string, unknown>) => {
          const text = typeof entry.text === "string" ? entry.text : typeof entry.messageSent === "string" ? entry.messageSent : null
          if (text === null || typeof entry.date !== "string") throw new Error("Invalid history entry")
          return { text, date: entry.date, recipientName: typeof entry.recipientName === "string" ? entry.recipientName : "Unknown" }
        })
        setImportPreview({
          examples: data.styleExamples.slice(0, 10),
          history: normalizedHistory.slice(0, 200),
          enabled: !!data.styleTrainingEnabled
        })
      } catch {
        setFileImportError("Invalid file format. Make sure this is a ColdCraft export file.")
      }
    }).catch(() => {
      setFileImportError("Could not read the file.")
    })
  }

  const renderTrainingCard = (ex: StyleExample) => {
    const cardKey = `${ex.rating}-${ex.date}`
    const isExpanded = expandedCard === cardKey
    const shortDate = new Date(ex.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const isLiked = ex.rating === "up"
    return (
      <div
        key={cardKey}
        className={`lcmg-card-collapsed${isExpanded ? " expanded" : ""}`}
        onClick={() => !isExpanded && setExpandedCard(cardKey)}>
        <div className="lcmg-card-header">
          <span className="lcmg-card-name" style={{ fontSize: 11 }}>
            {ex.text.slice(0, 30)}{ex.text.length > 30 ? "…" : ""}
          </span>
          <div className="lcmg-card-meta">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isLiked ? "#5FD98C" : "#f87171"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {isLiked
                ? <path d="M7 22V11L2 11V22H7ZM7 11L11.586 3.586C11.961 3.211 12.469 3 13 3H13.172C13.702 3 14.211 3.211 14.586 3.586L15 4V9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V13.126C22 13.4395 21.9386 13.7501 21.819 14.039L19.202 19.9545C19.0723 20.2619 18.6667 21 18 21H7" />
                : <path d="M17 2V13H22V2H17ZM17 13L12.414 20.414C12.039 20.789 11.531 21 11 21H10.828C10.298 21 9.789 20.789 9.414 20.414L9 20V15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V10.874C2 10.5605 2.0614 10.2499 2.181 9.961L4.798 4.0455C4.928 3.738 5.333 3 6 3H17" />}
            </svg>
            <span className="lcmg-card-date">{shortDate}</span>
            <span className={`lcmg-card-chevron${isExpanded ? " open" : ""}`}>{"▼"}</span>
          </div>
        </div>
        {!isExpanded && (
          <div className="lcmg-card-preview">
            {ex.text.slice(0, 60)}{ex.text.length > 60 ? "…" : ""}
          </div>
        )}
        <div className={`lcmg-card-body${isExpanded ? " open" : ""}`}>
          <div className="lcmg-card-message">{ex.text}</div>
          {editingNoteKey === cardKey ? (
            <div style={{ paddingBottom: 8 }} onClick={(e) => e.stopPropagation()}>
              <input
                className="lcmg-context-input"
                style={{ marginTop: 0 }}
                placeholder={isLiked ? "What did you like?" : "What would you change?"}
                value={editingNoteValue}
                autoFocus
                onChange={(e) => setEditingNoteValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                }}
                onBlur={() => {
                  persist(styleExamples.map((s) => s === ex ? { ...s, context: editingNoteValue.trim() || undefined } : s))
                  setEditingNoteKey(null)
                }}
              />
            </div>
          ) : (
            <div style={{ fontSize: 10.5, color: "rgba(147,197,253,0.6)", fontStyle: ex.context ? "italic" : "normal", paddingBottom: 8, cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation()
                setEditingNoteKey(cardKey)
                setEditingNoteValue(ex.context || "")
              }}>
              {ex.context ? `Note: "${ex.context}"` : <span style={{ color: "rgba(255,255,255,0.2)" }}>+ Add note</span>}
            </div>
          )}
          <div className="lcmg-card-actions">
            <button className="lcmg-btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }}
              onClick={(e) => {
                e.stopPropagation()
                setEditingNoteKey(cardKey)
                setEditingNoteValue(ex.context || "")
              }}>
              {ex.context ? "Edit note" : "Add note"}
            </button>
            <button className="lcmg-btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }}
              onClick={(e) => {
                e.stopPropagation()
                const newRating = ex.rating === "up" ? "down" : "up"
                persist(styleExamples.map((s) => s === ex ? { ...s, rating: newRating as "up" | "down" } : s))
              }}>
              Flip to {ex.rating === "up" ? "dislike" : "like"}
            </button>
            <button className="lcmg-btn-ghost" style={{ fontSize: 10, padding: "3px 8px", color: "rgba(239,68,68,0.5)", borderColor: "rgba(239,68,68,0.15)" }}
              onClick={(e) => {
                e.stopPropagation()
                persist(styleExamples.filter((s) => s !== ex))
                setExpandedCard(null)
              }}>
              Remove
            </button>
          </div>
        </div>
      </div>
    )
  }

  const liked = styleExamples.filter((e) => e.rating === "up")
  const disliked = styleExamples.filter((e) => e.rating === "down")
  const usedPerGeneration = Math.min(liked.length, 2) + Math.min(disliked.length, 2)

  return (
    <div className={`lcmg-settings${open ? " open" : ""}`} role="dialog" aria-modal={open} aria-label="Training Data">
      <div className="lcmg-settings-header">
        <button className="lcmg-settings-back" onClick={onClose} aria-label="Close training data">{"←"}</button>
        <span className="lcmg-settings-title">Training Data</span>
      </div>
      <div className="lcmg-settings-body">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Learn from my feedback</div>
          <button
            aria-label={styleTrainingEnabled ? "Disable style training" : "Enable style training"}
            onClick={() => {
              const next = !styleTrainingEnabled
              onToggleTraining(next)
              chrome.storage.local.set({ style_training_enabled: next })
            }}
            style={{
              width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
              background: styleTrainingEnabled ? "#2563EB" : "rgba(255,255,255,0.12)",
              position: "relative", transition: "background 0.2s"
            }}>
            <div style={{
              width: 16, height: 16, borderRadius: 8, background: "#fff",
              position: "absolute", top: 2,
              left: styleTrainingEnabled ? 18 : 2,
              transition: "left 0.2s"
            }} />
          </button>
        </div>

        {!styleTrainingEnabled && styleExamples.length > 0 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
            Your saved examples are kept but won't be included in generations while this is off.
          </div>
        )}

        <div className="lcmg-training-disclaimer">
          Each training example adds ~400–600 input tokens per generation.
          Max 10 examples stored. Up to 4 used per generation (2 liked, 2 disliked).
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          {styleExamples.length}/10 examples saved {"·"} {usedPerGeneration} used per generation
        </div>

        {liked.length > 0 && (
          <>
            <div className="lcmg-training-section-label">Liked messages ({liked.length})</div>
            {liked.map(renderTrainingCard)}
          </>
        )}

        {disliked.length > 0 && (
          <>
            <div className="lcmg-training-section-label">Disliked messages ({disliked.length})</div>
            {disliked.map(renderTrainingCard)}
          </>
        )}

        {styleExamples.length === 0 && (
          <div style={{ textAlign: "center", padding: "30px 16px", color: "rgba(255,255,255,0.25)", fontSize: 12, lineHeight: 1.6 }}>
            No training examples yet.<br />Rate messages with thumbs up/down after generating.
          </div>
        )}

        {styleExamples.length > 0 && (
          <button className="lcmg-btn-ghost" style={{ fontSize: 10, padding: "4px 8px", justifyContent: "center", color: "rgba(239,68,68,0.6)", borderColor: "rgba(239,68,68,0.2)" }}
            onClick={() => persist([])}>
            Clear all
          </button>
        )}

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0 4px" }} />
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.3)" }}>Backup</div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="lcmg-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={exportData}>
            {exportConfirm ? "Exported ✓" : "↓ Export"}
          </button>
          <button className="lcmg-btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => fileInputRef.current?.click()}>
            {"↑"} Import
          </button>
          <input ref={fileInputRef} type="file" accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ""
            }} />
        </div>
        {fileImportError && (
          <div style={{ fontSize: 11, color: "#f87171", lineHeight: 1.5 }}>{fileImportError}</div>
        )}
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: 1.5 }}>
          Exports training examples and message history as a JSON file.
        </div>
      </div>

      {importPreview && (
        <div className="lcmg-import-confirm">
          <div className="lcmg-import-confirm-card">
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Import ColdCraft data?</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              This file contains:<br />
              {"·"} {importPreview.examples.length} training examples<br />
              {"·"} {importPreview.history.length} message history entries
            </div>
            <div style={{ fontSize: 11.5, color: "#fbbf24", display: "flex", alignItems: "flex-start", gap: 6, lineHeight: 1.4 }}>
              <span>{"⚠"}</span>
              <span>This will REPLACE your current training data and message history.</span>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button className="lcmg-btn-ghost" onClick={() => setImportPreview(null)}>Cancel</button>
              <button className="lcmg-btn-sm" onClick={async () => {
                await chrome.storage.local.set({
                  style_examples: importPreview.examples,
                  message_history: importPreview.history,
                  style_training_enabled: importPreview.enabled
                })
                onUpdateExamples(importPreview.examples)
                onReplaceHistory(importPreview.history)
                onToggleTraining(importPreview.enabled)
                setImportPreview(null)
              }}>Replace & Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
