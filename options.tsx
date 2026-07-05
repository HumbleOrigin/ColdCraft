import { useEffect, useState } from "react"
import { ANTHROPIC_MODELS, OPENAI_MODELS } from "./background/aiClient"

function Options() {
  const [provider, setProvider] = useState<"anthropic" | "openai">("anthropic")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [saved, setSaved] = useState(false)
  const [hasKey, setHasKey] = useState(false)

  const models = provider === "anthropic" ? ANTHROPIC_MODELS : OPENAI_MODELS

  useEffect(() => {
    Promise.all([
      chrome.storage.local.get("ai_api_key"),
      chrome.storage.sync.get(["ai_provider", "ai_api_key", "ai_model", "ai_base_url"])
    ]).then(([local, result]) => {
      if (result.ai_provider) setProvider(result.ai_provider)
      // sync ai_api_key is a pre-1.0.3 leftover, shown until loadAIConfig migrates it
      const key = local.ai_api_key || result.ai_api_key
      if (key) {
        setApiKey(key)
        setHasKey(true)
      }
      if (result.ai_model) setModel(result.ai_model)
      if (result.ai_base_url) setBaseUrl(result.ai_base_url)
    })
  }, [])

  const save = async () => {
    const settings: Record<string, string> = {
      ai_provider: provider,
    }
    if (model.trim()) settings.ai_model = model.trim()
    if (baseUrl.trim()) settings.ai_base_url = baseUrl.trim()
    await chrome.storage.sync.set(settings)
    await chrome.storage.local.set({ ai_api_key: apiKey.trim() })

    const keysToRemove: string[] = ["ai_api_key"] // clear any pre-1.0.3 key left in sync
    if (!model.trim()) keysToRemove.push("ai_model")
    if (!baseUrl.trim()) keysToRemove.push("ai_base_url")
    await chrome.storage.sync.remove(keysToRemove)

    setHasKey(!!apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const remove = async () => {
    await chrome.storage.sync.remove(["ai_provider", "ai_api_key", "ai_model", "ai_base_url"])
    await chrome.storage.local.remove("ai_api_key")
    setApiKey("")
    setModel("")
    setBaseUrl("")
    setHasKey(false)
    setProvider("anthropic")
  }

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 400 700;
          font-display: swap;
          src: url('./assets/fonts/inter-latin.woff2') format('woff2');
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: #0A0F1E; color: #fff; min-height: 100vh; }
        .page { max-width: 500px; margin: 0 auto; padding: 48px 24px; }
        .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 36px; }
        .logo-icon { width: 36px; height: 36px; background: #2563EB; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; }
        .logo-text { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
        h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.5; margin-bottom: 28px; }
        .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
        .input-row { display: flex; gap: 10px; }
        input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 13px; padding: 12px 14px; outline: none; font-family: inherit; transition: border-color 0.15s; }
        input:focus { border-color: #2563EB; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        .btn-primary { background: #2563EB; border: none; color: #fff; font-size: 13px; font-weight: 600; padding: 12px 20px; border-radius: 8px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .btn-primary:hover { background: #3b7cf7; }
        .btn-primary:focus-visible, .btn-ghost:focus-visible, .provider-btn:focus-visible, select:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
        .btn-ghost { background: none; border: 1px solid rgba(255,80,80,0.3); color: rgba(255,100,100,0.8); font-size: 12px; font-weight: 500; padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .btn-ghost:hover { background: rgba(255,80,80,0.08); border-color: rgba(255,80,80,0.5); }
        .status { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; }
        .status.success { background: rgba(95,217,140,0.08); border: 1px solid rgba(95,217,140,0.2); color: #5FD98C; }
        .status.has-key { background: rgba(37,99,235,0.08); border: 1px solid rgba(37,99,235,0.2); color: #93c5fd; }
        .divider { height: 1px; background: rgba(255,255,255,0.07); }
        .note { font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.6; }
        a { color: #2563EB; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .provider-toggle { display: flex; gap: 8px; margin-bottom: 4px; }
        .provider-btn { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.15s; }
        .provider-btn.active { background: rgba(37,99,235,0.15); border-color: rgba(37,99,235,0.4); color: #93c5fd; }
        .provider-btn:hover:not(.active) { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-hint { font-size: 11px; color: rgba(255,255,255,0.3); }
      `}</style>
      <div className="page">
        <div className="logo">
          <div className="logo-icon">✦</div>
          <span className="logo-text">ColdCraft</span>
        </div>
        <h1>Settings</h1>
        <p className="subtitle">
          Configure your AI provider and API key to power message generation.
          Your key is stored on this device in Chrome's local extension storage
          and is sent only to your chosen AI provider's API.
        </p>

        <div className="card">
          <div>
            <div className="label">Provider</div>
            <div className="provider-toggle">
              <button
                className={`provider-btn${provider === "anthropic" ? " active" : ""}`}
                onClick={() => setProvider("anthropic")}>
                Anthropic (Claude)
              </button>
              <button
                className={`provider-btn${provider === "openai" ? " active" : ""}`}
                onClick={() => setProvider("openai")}>
                OpenAI / Compatible (GPT, OpenRouter…)
              </button>
            </div>
          </div>

          <div className="field">
            <div className="label">API Key</div>
            <div className="input-row">
              <input
                type="password"
                placeholder={provider === "anthropic" ? "sk-ant-..." : "sk-..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
            </div>
          </div>

          <div className="field">
            <div className="label">Model</div>
            <select
              value={model || models[0].id}
              onChange={(e) => setModel(e.target.value)}
              style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 13, padding: "10px 14px", outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.4)' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
              {models.map((m) => (
                <option key={m.id} value={m.id} style={{ background: "#0A0F1E", color: "#fff" }}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="field-hint">
              {models.find((m) => m.id === (model || models[0].id))
                ? `$${(models.find((m) => m.id === (model || models[0].id))!.costPer1kInput * 1000).toFixed(2)}/M input, $${(models.find((m) => m.id === (model || models[0].id))!.costPer1kOutput * 1000).toFixed(2)}/M output tokens`
                : ""}
            </div>
          </div>

          {provider === "openai" && (
            <div className="field">
              <div className="label">Base URL</div>
              <input
                type="text"
                placeholder="https://api.openai.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <div className="field-hint">
                Change for OpenRouter (openrouter.ai/api/v1). OpenRouter also proxies most other providers' models.
              </div>
            </div>
          )}

          <button className="btn-primary" onClick={save}>
            {saved ? "Saved ✓" : "Save"}
          </button>

          {saved && (
            <div className="status success">
              ✓ Settings saved successfully
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
            {provider === "anthropic" ? (
              <>
                Don't have a key?{" "}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
                  Get one at console.anthropic.com
                </a>
                {" "}— it only takes a minute. Each message costs less than a penny.
              </>
            ) : (
              <>
                Get an API key from your provider's dashboard.
                For OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">platform.openai.com</a>.
                For other providers, set the Base URL above.
              </>
            )}
          </p>
        </div>
      </div>
    </>
  )
}

export default Options
