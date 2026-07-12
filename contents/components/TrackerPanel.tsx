import { sendToBackground } from "@plasmohq/messaging"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Contact, ContactStatus, Interaction } from "../../background/db"

type View = "list" | "detail" | "add" | "import"

const STATUS_COLORS: Record<ContactStatus, string> = {
  copied: "#93c5fd",
  waiting: "#fbbf24",
  replied: "#5FD98C",
  dead: "rgba(255,255,255,0.25)",
}

const STATUS_ORDER: ContactStatus[] = ["copied", "waiting", "replied", "dead"]

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

type Props = {
  open: boolean
  onClose: () => void
  onFollowUpCount: (count: number) => void
}

export default function TrackerPanel({ open, onClose, onFollowUpCount }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [followUps, setFollowUps] = useState<Contact[]>([])
  const [interactions, setInteractions] = useState<Record<number, Interaction[]>>({})
  const [view, setView] = useState<View>("list")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editDraft, setEditDraft] = useState({ name: "", company: "", title: "" })
  const [addDraft, setAddDraft] = useState({ name: "", company: "", linkedinUrl: "", title: "", status: "copied" as ContactStatus })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    const resp = await sendToBackground<
      { includeInteractions: boolean },
      { contacts: Contact[]; followUpsDue: Contact[]; interactions?: Record<number, Interaction[]>; error?: string }
    >({ name: "getContacts", body: { includeInteractions: true } })

    if (!resp.error) {
      setContacts(resp.contacts)
      setFollowUps(resp.followUpsDue)
      if (resp.interactions) setInteractions(resp.interactions)
      onFollowUpCount(resp.followUpsDue.length)
    }
    setLoading(false)
  }, [onFollowUpCount])

  useEffect(() => {
    if (open) loadContacts()
  }, [open, loadContacts])

  const advanceStatus = async (contact: Contact) => {
    const currentIdx = STATUS_ORDER.indexOf(contact.status)
    if (currentIdx >= STATUS_ORDER.length - 1) return
    const newStatus = STATUS_ORDER[currentIdx + 1]
    await sendToBackground({ name: "updateContactStatus", body: { id: contact.id, status: newStatus } })
    await loadContacts()
    if (selectedContact?.id === contact.id) {
      setSelectedContact({ ...contact, status: newStatus })
    }
  }

  const setStatus = async (contact: Contact, status: ContactStatus) => {
    await sendToBackground({ name: "updateContactStatus", body: { id: contact.id, status } })
    await loadContacts()
    if (selectedContact?.id === contact.id) {
      setSelectedContact({ ...contact, status })
    }
  }

  const handleDelete = async () => {
    if (!selectedContact) return
    await sendToBackground({ name: "deleteContact", body: { id: selectedContact.id } })
    setSelectedContact(null)
    setConfirmDelete(false)
    setView("list")
    await loadContacts()
  }

  const handleEdit = async () => {
    if (!selectedContact) return
    await sendToBackground({
      name: "updateContactStatus",
      body: { id: selectedContact.id, name: editDraft.name, company: editDraft.company, title: editDraft.title }
    })
    setEditMode(false)
    setSelectedContact({ ...selectedContact, name: editDraft.name, company: editDraft.company, title: editDraft.title })
    await loadContacts()
  }

  const handleAdd = async () => {
    if (!addDraft.name || !addDraft.linkedinUrl) return
    const now = new Date().toISOString()
    await sendToBackground({
      name: "trackContact",
      body: {
        linkedinUrl: addDraft.linkedinUrl,
        name: addDraft.name,
        company: addDraft.company,
        title: addDraft.title,
        messageText: "",
        messageType: "manual",
      }
    })
    if (addDraft.status !== "copied") {
      const resp = await sendToBackground<
        { includeInteractions: boolean },
        { contacts: Contact[] }
      >({ name: "getContacts", body: { includeInteractions: false } })
      const added = resp.contacts.find((c) => c.linkedinUrl === addDraft.linkedinUrl)
      if (added) {
        await sendToBackground({ name: "updateContactStatus", body: { id: added.id, status: addDraft.status } })
      }
    }
    setAddDraft({ name: "", company: "", linkedinUrl: "", title: "", status: "copied" })
    setView("list")
    await loadContacts()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const resp = await sendToBackground<
      { csvText: string },
      { imported: number; skipped: number; updated: number; errors: string[] }
    >({ name: "importContacts", body: { csvText: text } })
    setImportResult(`Imported ${resp.imported} contacts${resp.skipped > 0 ? `, skipped ${resp.skipped} rows` : ""}`)
    if (fileInputRef.current) fileInputRef.current.value = ""
    await loadContacts()
    setTimeout(() => setImportResult(null), 4000)
  }

  const handleExport = async () => {
    const resp = await sendToBackground<{}, { csv?: string; error?: string }>({ name: "exportContacts", body: {} })
    if (resp.csv) {
      const blob = new Blob([resp.csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `coldcraft-contacts-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const recentContacts = [...contacts]
    .sort((a, b) => new Date(b.lastContactDate).getTime() - new Date(a.lastContactDate).getTime())
    .slice(0, 10)

  const allSorted = [...contacts]
    .sort((a, b) => new Date(b.lastContactDate).getTime() - new Date(a.lastContactDate).getTime())

  return (
    <div className={`lcmg-settings${open ? " open" : ""}`}>
      <div className="lcmg-settings-header">
        <button className="lcmg-settings-back" onClick={() => {
          if (view === "detail" || view === "add") { setView("list"); setSelectedContact(null); setEditMode(false); setConfirmDelete(false) }
          else onClose()
        }}>{"←"}</button>
        <span className="lcmg-settings-title">
          {view === "detail" ? (selectedContact?.name || "Contact") : view === "add" ? "Add Contact" : "Outreach Tracker"}
        </span>
        {view === "list" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="lcmg-btn-sm" onClick={() => setView("add")}>+ Add</button>
            <button className="lcmg-btn-sm" onClick={() => fileInputRef.current?.click()}>Import</button>
            <button className="lcmg-btn-sm" onClick={handleExport}>Export</button>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImport} />

      <div className="lcmg-settings-body">
        {importResult && (
          <div style={{ fontSize: 11.5, color: "#5FD98C", background: "rgba(95,217,140,0.08)", border: "1px solid rgba(95,217,140,0.2)", borderRadius: 8, padding: "8px 12px" }}>
            {importResult}
          </div>
        )}

        {loading && view === "list" && (
          <div className="lcmg-no-profile">Loading contacts...</div>
        )}

        {/* List View */}
        {view === "list" && !loading && (
          <>
            {followUps.length > 0 && (
              <div>
                <div className="lcmg-section-label" style={{ color: "#fbbf24" }}>Follow up ({followUps.length})</div>
                {followUps.map((c) => (
                  <ContactCard key={c.id} contact={c} onClick={() => { setSelectedContact(c); setView("detail") }} onAdvance={() => advanceStatus(c)} />
                ))}
              </div>
            )}

            {recentContacts.length > 0 && (
              <div style={{ marginTop: followUps.length > 0 ? 12 : 0 }}>
                <div className="lcmg-section-label">Recent</div>
                {recentContacts.map((c) => (
                  <ContactCard key={c.id} contact={c} onClick={() => { setSelectedContact(c); setView("detail") }} onAdvance={() => advanceStatus(c)} />
                ))}
              </div>
            )}

            {contacts.length === 0 && (
              <div className="lcmg-no-profile">
                No contacts tracked yet. Generate and copy a message to auto-capture, or add contacts manually.
              </div>
            )}

            {contacts.length > 10 && (
              <div style={{ marginTop: 12 }}>
                <div className="lcmg-section-label">All contacts ({contacts.length})</div>
                {allSorted.slice(10).map((c) => (
                  <ContactCard key={c.id} contact={c} onClick={() => { setSelectedContact(c); setView("detail") }} onAdvance={() => advanceStatus(c)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Detail View */}
        {view === "detail" && selectedContact && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {editMode ? (
              <>
                <div className="lcmg-field">
                  <div className="lcmg-field-label">Name</div>
                  <input className="lcmg-input" value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
                </div>
                <div className="lcmg-field">
                  <div className="lcmg-field-label">Company</div>
                  <input className="lcmg-input" value={editDraft.company} onChange={(e) => setEditDraft({ ...editDraft, company: e.target.value })} />
                </div>
                <div className="lcmg-field">
                  <div className="lcmg-field-label">Title</div>
                  <input className="lcmg-input" value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="lcmg-btn-primary" style={{ flex: 1 }} onClick={handleEdit}>Save</button>
                  <button className="lcmg-btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="lcmg-profile">
                  <div className="lcmg-profile-name">{selectedContact.name}</div>
                  <div className="lcmg-profile-title">
                    {[selectedContact.title, selectedContact.company].filter(Boolean).join(" at ")}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[selectedContact.status] }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{selectedContact.status}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                      {daysAgo(selectedContact.lastContactDate) === 0 ? "today" : `${daysAgo(selectedContact.lastContactDate)}d ago`}
                    </span>
                  </div>
                </div>

                {/* Status controls */}
                <div>
                  <div className="lcmg-section-label">Status</div>
                  <div className="lcmg-chip-row">
                    {STATUS_ORDER.map((s) => (
                      <span
                        key={s}
                        className={`lcmg-chip${selectedContact.status === s ? " active" : ""}`}
                        onClick={() => setStatus(selectedContact, s)}
                        style={{ textTransform: "capitalize" }}
                      >{s}</span>
                    ))}
                  </div>
                </div>

                {/* Interaction history */}
                <div>
                  <div className="lcmg-section-label">Messages ({(interactions[selectedContact.id!] || []).length})</div>
                  {(interactions[selectedContact.id!] || []).length === 0 ? (
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)" }}>No messages recorded.</div>
                  ) : (
                    (interactions[selectedContact.id!] || [])
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((i) => (
                        <div key={i.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
                            {i.messageType} {"·"} {new Date(i.date).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                            {i.messageText ? (i.messageText.length > 200 ? i.messageText.slice(0, 200) + "…" : i.messageText) : "(no text)"}
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="lcmg-btn-ghost" onClick={() => { setEditDraft({ name: selectedContact.name, company: selectedContact.company, title: selectedContact.title }); setEditMode(true) }}>Edit</button>
                  <button className="lcmg-btn-ghost" style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)" }} onClick={() => setConfirmDelete(true)}>Delete</button>
                </div>

                {confirmDelete && (
                  <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "#f87171" }}>Delete {selectedContact.name}? This can't be undone.</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="lcmg-btn-primary" style={{ background: "#dc2626", flex: 1 }} onClick={handleDelete}>Delete</button>
                      <button className="lcmg-btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Add View */}
        {view === "add" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="lcmg-field">
              <div className="lcmg-field-label">Name *</div>
              <input className="lcmg-input" placeholder="John Doe" value={addDraft.name} onChange={(e) => setAddDraft({ ...addDraft, name: e.target.value })} />
            </div>
            <div className="lcmg-field">
              <div className="lcmg-field-label">LinkedIn URL *</div>
              <input className="lcmg-input" placeholder="https://linkedin.com/in/..." value={addDraft.linkedinUrl} onChange={(e) => setAddDraft({ ...addDraft, linkedinUrl: e.target.value })} />
            </div>
            <div className="lcmg-field">
              <div className="lcmg-field-label">Company</div>
              <input className="lcmg-input" placeholder="Goldman Sachs" value={addDraft.company} onChange={(e) => setAddDraft({ ...addDraft, company: e.target.value })} />
            </div>
            <div className="lcmg-field">
              <div className="lcmg-field-label">Title</div>
              <input className="lcmg-input" placeholder="VP, M&A" value={addDraft.title} onChange={(e) => setAddDraft({ ...addDraft, title: e.target.value })} />
            </div>
            <div className="lcmg-field">
              <div className="lcmg-field-label">Status</div>
              <div className="lcmg-chip-row">
                {STATUS_ORDER.map((s) => (
                  <span key={s} className={`lcmg-chip${addDraft.status === s ? " active" : ""}`} onClick={() => setAddDraft({ ...addDraft, status: s })} style={{ textTransform: "capitalize" }}>{s}</span>
                ))}
              </div>
            </div>
            <button className="lcmg-btn-primary" onClick={handleAdd} disabled={!addDraft.name || !addDraft.linkedinUrl}>
              Add Contact
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ContactCard({ contact, onClick, onAdvance }: { contact: Contact; onClick: () => void; onAdvance: () => void }) {
  return (
    <div
      className="lcmg-profile"
      style={{ cursor: "pointer", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}
      onClick={onClick}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[contact.status], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {contact.name}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {[contact.title, contact.company].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          {daysAgo(contact.lastContactDate) === 0 ? "today" : `${daysAgo(contact.lastContactDate)}d`}
        </span>
        {contact.status !== "dead" && (
          <button
            className="lcmg-btn-sm"
            style={{ padding: "3px 8px", fontSize: 10 }}
            onClick={(e) => { e.stopPropagation(); onAdvance() }}
            title={`Advance to ${STATUS_ORDER[STATUS_ORDER.indexOf(contact.status) + 1]}`}
          >{"→"}</button>
        )}
      </div>
    </div>
  )
}
