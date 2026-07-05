type HistoryEntry = { text: string; date: string; recipientName: string }

type Props = {
  open: boolean
  onClose: () => void
  history: HistoryEntry[]
  onSelect: (text: string) => void
}

export default function HistoryPanel({ open, onClose, history, onSelect }: Props) {
  return (
    <div className={`lcmg-settings${open ? " open" : ""}`}>
      <div className="lcmg-settings-header">
        <button className="lcmg-settings-back" onClick={onClose}>{"←"}</button>
        <span className="lcmg-settings-title">Message History</span>
      </div>
      <div className="lcmg-settings-body">
        {history.length === 0 ? (
          <div className="lcmg-no-profile">No messages generated yet.</div>
        ) : (
          history.map((h, i) => (
            <div key={i} className="lcmg-profile" style={{ cursor: "pointer" }} onClick={() => onSelect(h.text)}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
                {h.recipientName} {"·"} {new Date(h.date).toLocaleDateString()}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                {h.text.slice(0, 120)}{"…"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
