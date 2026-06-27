import { useEffect, useState } from "react"

function Options() {
  const [apiKey, setApiKey] = useState("")
  const [saved, setSaved] = useState(false)
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    chrome.storage.sync.get("anthropic_api_key").then((result) => {
      if (result.anthropic_api_key) {
        setHasKey(true)
        setApiKey(result.anthropic_api_key)
      }
    })
  }, [])

  const save = async () => {
    await chrome.storage.sync.set({ anthropic_api_key: apiKey.trim() })
    setHasKey(!!apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const remove = async () => {
    await chrome.storage.sync.remove("anthropic_api_key")
    setApiKey("")
    setHasKey(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: #0A0F1E; color: #fff; min-height: 100vh; }
        .page { max-width: 500px; margin: 0 auto; padding: 48px 24px; }
        .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 36px; }
        .logo-icon { width: 36px; height: 36px; background: #6C63FF; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; }
        .logo-text { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
        h2 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.5; margin-bottom: 28px; }
        .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
        .input-row { display: flex; gap: 10px; }
        input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; padding: 10px 14px; outline: none; font-family: inherit; transition: border-color 0.15s; }
        input:focus { border-color: #6C63FF; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        .btn-primary { background: #6C63FF; border: none; color: #fff; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .btn-primary:hover { background: #7B74FF; }
        .btn-ghost { background: none; border: 1px solid rgba(255,80,80,0.3); color: rgba(255,100,100,0.8); font-size: 12px; font-weight: 500; padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .btn-ghost:hover { background: rgba(255,80,80,0.08); border-color: rgba(255,80,80,0.5); }
        .status { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; }
        .status.success { background: rgba(95,217,140,0.08); border: 1px solid rgba(95,217,140,0.2); color: #5FD98C; }
        .status.has-key { background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.2); color: #A89EFF; }
        .divider { height: 1px; background: rgba(255,255,255,0.07); }
        .note { font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.6; }
        a { color: #6C63FF; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>
      <div className="page">
        <div className="logo">
          <div className="logo-icon">✦</div>
          <span className="logo-text">ColdCraft</span>
        </div>
        <h2>Settings</h2>
        <p className="subtitle">
          Configure your Anthropic API key to power AI message generation.
          Your key is stored locally in Chrome and never leaves your device
          except when calling Anthropic's API.
        </p>

        <div className="card">
          <div>
            <div className="label">Anthropic API Key</div>
            <div className="input-row">
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
              <button className="btn-primary" onClick={save}>
                {saved ? "Saved ✓" : "Save"}
              </button>
            </div>
          </div>

          {saved && (
            <div className="status success">
              ✓ API key saved successfully
            </div>
          )}

          {hasKey && !saved && (
            <div className="status has-key">
              ✦ API key is configured and ready
            </div>
          )}

          {hasKey && (
            <>
              <div className="divider" />
              <button className="btn-ghost" onClick={remove}>
                Remove API key
              </button>
            </>
          )}

          <div className="divider" />
          <p className="note">
            Don't have a key?{" "}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noreferrer">
              Get one at console.anthropic.com
            </a>{" "}
            — it only takes a minute. API usage is pay-per-use and typically
            costs a fraction of a cent per message generated.
          </p>
        </div>
      </div>
    </>
  )
}

export default Options
