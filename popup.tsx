function Popup() {
  const openOptions = () => chrome.runtime.openOptionsPage()

  const openSidebar = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    const url = tab.url ?? ""
    if (!url.includes("linkedin.com/in/")) {
      // Not on a profile page — open LinkedIn
      chrome.tabs.create({ url: "https://www.linkedin.com" })
      return
    }
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_SIDEBAR" })
    window.close()
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: #0A0F1E; color: #fff; width: 260px; }
        .popup { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .logo { display: flex; align-items: center; gap: 8px; }
        .logo-icon { width: 28px; height: 28px; background: #6C63FF; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
        .logo-text { font-size: 14px; font-weight: 700; }
        .divider { height: 1px; background: rgba(255,255,255,0.07); }
        .btn-primary { width: 100%; background: #6C63FF; border: none; color: #fff; font-size: 13px; font-weight: 600; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover { background: #7B74FF; }
        .btn { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 12px; padding: 8px; border-radius: 7px; cursor: pointer; transition: all 0.15s; text-align: center; }
        .btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .step { display: flex; align-items: flex-start; gap: 10px; }
        .step-num { width: 20px; height: 20px; background: rgba(108,99,255,0.2); border: 1px solid rgba(108,99,255,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #A89EFF; flex-shrink: 0; margin-top: 1px; }
        .step-text { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.5; }
      `}</style>
      <div className="popup">
        <div className="logo">
          <div className="logo-icon">✦</div>
          <span className="logo-text">ColdCraft</span>
        </div>
        <div className="divider" />
        <button className="btn-primary" onClick={openSidebar}>
          ◀ Open Sidebar
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-text">Navigate to any LinkedIn profile page</div>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-text">Click "Open Sidebar" above, or click the purple ◀ tab on the right edge of the page</div>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-text">Set up your info, add any custom instructions, then generate</div>
          </div>
        </div>
        <div className="divider" />
        <button className="btn" onClick={openOptions}>⚙ Settings &amp; API Key</button>
      </div>
    </>
  )
}

export default Popup
