type Props = {
  profileName: string
  rawProfileText: string | null
  profileSource: "text" | null
  profileWarning: boolean
  hookLoading: boolean
  hookDetails: string[]
  selectedHook: string | null
  onSelectHook: (hook: string | null) => void
  onRescrape: () => void
  hasSkills: boolean
}

export default function ProfileSection({
  profileName, rawProfileText, profileSource, profileWarning,
  hookLoading, hookDetails, selectedHook, onSelectHook, onRescrape, hasSkills
}: Props) {
  return (
    <div>
      <div className="lcmg-section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Profile Detected</span>
        {profileSource === "text" && <span style={{ color: "#5FD98C", fontSize: 9, fontWeight: 600, letterSpacing: "0.5px" }}>{"✓"} LOADED</span>}
      </div>
      {profileName || rawProfileText ? (
        <div className="lcmg-profile">
          {profileName && <div className="lcmg-profile-name">{profileName}</div>}
          {rawProfileText && !hasSkills && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>Profile text captured, AI will extract details</div>
          )}
          {(hookLoading || hookDetails.length > 0) && (
            <div className="lcmg-badge-row" style={{ marginTop: 8 }}>
              {hookLoading ? (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Finding hook details{"…"}</span>
              ) : (
                hookDetails.map((h) => (
                  <span key={h} className={`lcmg-badge${selectedHook === h ? " selected" : ""}`} onClick={() => onSelectHook(selectedHook === h ? null : h)}>{h}</span>
                ))
              )}
            </div>
          )}
          <button className="lcmg-btn-ghost" style={{ marginTop: 6, fontSize: 11 }} onClick={onRescrape}>{"↺"} Rescrape</button>
        </div>
      ) : (
        <div className="lcmg-no-profile">Loading profile{"…"}</div>
      )}
      {profileWarning && (
        <div className="lcmg-warning" style={{ marginTop: 8 }}>
          <span>{"⚠"}</span>
          <span>Couldn't read this profile. Make sure you're on a LinkedIn profile page.</span>
        </div>
      )}
    </div>
  )
}
