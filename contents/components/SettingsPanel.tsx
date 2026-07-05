import { sendToBackground } from "@plasmohq/messaging"
import { useState } from "react"
import type { SenderInfo } from "../../background/messages/generateMessage"

type Props = {
  open: boolean
  onClose: () => void
  senderInfo: SenderInfo | null
  setupDraft: SenderInfo
  setSetupDraft: (d: SenderInfo | ((prev: SenderInfo) => SenderInfo)) => void
  senderLinkedinText: string
  setSenderLinkedinText: (v: string) => void
  resumeText: string
  setResumeText: (v: string) => void
  hasApiKey: boolean | null
  apiKeyInput: string
  setApiKeyInput: (v: string) => void
  onSave: () => void
  onClear: () => void
  onSaveApiKey: () => void
  savingKey: boolean
  scrapeRawPageText: () => string
}

export default function SettingsPanel({
  open, onClose, senderInfo, setupDraft, setSetupDraft,
  senderLinkedinText, setSenderLinkedinText, resumeText, setResumeText,
  hasApiKey, apiKeyInput, setApiKeyInput, onSave, onClear, onSaveApiKey,
  savingKey, scrapeRawPageText
}: Props) {
  const [importingProfile, setImportingProfile] = useState(false)
  const [importError, setImportError] = useState("")

  const importFromLinkedIn = async () => {
    if (!window.location.pathname.includes("/in/")) {
      setImportError("Navigate to your own LinkedIn profile page first, then click this button.")
      return
    }
    setImportingProfile(true)
    setImportError("")

    const pageText = scrapeRawPageText()
    if (!pageText) {
      setImportError("Couldn't read this page. Make sure you're on your LinkedIn profile and logged in.")
      setImportingProfile(false)
      return
    }

    try {
      const response = await sendToBackground<
        { pageText: string },
        { senderInfo?: Partial<SenderInfo>; error?: string }
      >({ name: "extractSenderProfile", body: { pageText } })

      if (response.error === "NO_API_KEY") {
        setImportError("Add your API key first.")
      } else if (response.error) {
        setImportError(`Extraction failed: ${response.error}`)
      } else if (response.senderInfo) {
        setSetupDraft((d: SenderInfo) => ({
          name: response.senderInfo!.name || d.name,
          school: response.senderInfo!.school || d.school,
          year: response.senderInfo!.year || d.year,
          status: response.senderInfo!.status || d.status,
          targetArea: d.targetArea
        }))
        setSenderLinkedinText(pageText)
      }
    } catch {
      setImportError("Failed to extract profile. Try reloading the page.")
    }

    setImportingProfile(false)
  }

  return (
    <div className={`lcmg-settings${open ? " open" : ""}`}>
      <div className="lcmg-settings-header">
        <button className="lcmg-settings-back" onClick={onClose}>{"←"}</button>
        <span className="lcmg-settings-title">Your Info</span>
      </div>
      <div className="lcmg-settings-body">
        <div className="lcmg-setup-desc">Used in every message you generate. Import from your LinkedIn page or fill in manually.</div>
        <button className="lcmg-btn-ghost" style={{ justifyContent: "center" }} onClick={importFromLinkedIn} disabled={importingProfile}>
          {importingProfile ? "Reading your profile…" : "⬇ Import from my LinkedIn page"}
        </button>
        {importError && <div style={{ fontSize: 11, color: "#FFB84D", lineHeight: 1.5 }}>{"⚠"} {importError}</div>}
        <div className="lcmg-field">
          <div className="lcmg-field-label">Your Name</div>
          <input className="lcmg-input" placeholder="Jane Smith" value={setupDraft.name} onChange={(e) => setSetupDraft({ ...setupDraft, name: e.target.value })} />
        </div>
        <div className="lcmg-field">
          <div className="lcmg-field-label">School</div>
          <input className="lcmg-input" placeholder="University of Michigan" value={setupDraft.school} onChange={(e) => setSetupDraft({ ...setupDraft, school: e.target.value })} />
        </div>
        <div className="lcmg-field">
          <div className="lcmg-field-label">Year / Level</div>
          <input className="lcmg-input" placeholder="Junior, Senior, MBA1, Recent grad…" value={setupDraft.year} onChange={(e) => setSetupDraft({ ...setupDraft, year: e.target.value })} />
        </div>
        <div className="lcmg-field">
          <div className="lcmg-field-label">Current Status</div>
          <input className="lcmg-input" placeholder="Breaking in / Incoming analyst at Lazard…" value={setupDraft.status} onChange={(e) => setSetupDraft({ ...setupDraft, status: e.target.value })} />
        </div>
        <div className="lcmg-field">
          <div className="lcmg-field-label">Target Area</div>
          <input className="lcmg-input" placeholder="M&A, ECM, Restructuring, Coverage…" value={setupDraft.targetArea} onChange={(e) => setSetupDraft({ ...setupDraft, targetArea: e.target.value })} />
        </div>
        <div className="lcmg-divider" style={{ margin: "8px 0" }} />
        <div className="lcmg-field-label">LinkedIn Profile Context</div>
        {senderLinkedinText ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{"✓"} {senderLinkedinText.split(/\s+/).length} words captured</span>
            <button className="lcmg-btn-ghost" style={{ fontSize: 11 }} onClick={() => setSenderLinkedinText("")}>Clear</button>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>Use "Import from my LinkedIn page" above to capture your profile.</div>
        )}
        <div className="lcmg-field" style={{ marginTop: 8 }}>
          <div className="lcmg-field-label">Resume (paste text)</div>
          <textarea className="lcmg-input" style={{ minHeight: 80, resize: "vertical", fontFamily: "inherit", fontSize: 12, lineHeight: 1.5 }} placeholder="Paste your resume text here for richer context matching..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
          {resumeText && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{resumeText.split(/\s+/).length} words</span>}
        </div>
        <button className="lcmg-btn-primary" onClick={onSave} disabled={!setupDraft.name.trim() || !setupDraft.school.trim()}>Save</button>
        {senderInfo && (
          <button className="lcmg-btn-ghost" style={{ justifyContent: "center", color: "rgba(255,80,80,0.7)", borderColor: "rgba(255,80,80,0.2)" }} onClick={onClear}>Clear my info</button>
        )}
        <div className="lcmg-divider" style={{ margin: "12px 0" }} />
        <div className="lcmg-field-label">API Key</div>
        {hasApiKey ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Key saved {"✓"}</span>
            <button className="lcmg-btn-ghost" style={{ fontSize: 11 }} onClick={async () => { await chrome.storage.sync.remove("ai_api_key"); setApiKeyInput("") }}>Change</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, lineHeight: 1.5 }}>
              Get a key at <a className="lcmg-api-link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>
            </div>
            <div className="lcmg-api-row">
              <input className="lcmg-input" type="password" placeholder="sk-ant-..." value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSaveApiKey()} />
              <button className="lcmg-btn-sm" onClick={onSaveApiKey} disabled={savingKey || !apiKeyInput.trim()}>{savingKey ? "..." : "Save"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
