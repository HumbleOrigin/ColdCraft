import { sendToBackground } from "@plasmohq/messaging"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useCallback, useEffect, useRef, useState } from "react"
import type { GenerateMessageRequest, GenerateMessageResponse, SenderInfo, StyleExample } from "../background/messages/generateMessage"

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    :host {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: 0 !important;
      height: 0 !important;
      z-index: 2147483647 !important;
      overflow: visible !important;
      pointer-events: none !important;
    }
    :host > * {
      pointer-events: auto !important;
    }
  `
  return style
}

type Profile = {
  name: string
  title: string
  company: string
  location: string
  about: string
  skills: string[]
  experience: Array<{ title: string; company: string; duration: string }>
  education: { institution: string; degree: string; endYear?: number }
}

const EMPTY_PROFILE: Profile = {
  name: "",
  title: "",
  company: "",
  location: "",
  about: "",
  skills: [],
  experience: [],
  education: { institution: "", degree: "" }
}

function scrapeRawPageText(): string {
  const main = document.querySelector("main") ?? document.body
  const clone = main.cloneNode(true) as HTMLElement
  clone.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove())
  const text = clone.innerText ?? clone.textContent ?? ""
  return text.replace(/\n{3,}/g, "\n\n").trim().slice(0, 6000)
}

export const config: PlasmoCSConfig = {
  matches: ["https://www.linkedin.com/in/*"],
  run_at: "document_idle"
}

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [rawProfileText, setRawProfileText] = useState<string | null>(null)
  const [profileWarning, setProfileWarning] = useState(false)
  const [profileSource, setProfileSource] = useState<"text" | null>(null)

  const [referralName, setReferralName] = useState("")
  const [customInstructions, setCustomInstructions] = useState("")

  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState<string[]>([])
  const [error, setError] = useState("")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [savingKey, setSavingKey] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  const [senderInfo, setSenderInfo] = useState<SenderInfo | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [setupDraft, setSetupDraft] = useState<SenderInfo>({ name: "", school: "", year: "", status: "", targetArea: "" })
  const [senderLinkedinText, setSenderLinkedinText] = useState("")
  const [resumeText, setResumeText] = useState("")

  const [hookDetails, setHookDetails] = useState<string[]>([])
  const [hookLoading, setHookLoading] = useState(false)
  const [selectedHook, setSelectedHook] = useState<string | null>(null)

  const [messageType, setMessageType] = useState<"cold" | "thank_you" | "follow_up" | "circle_back">("cold")
  const [variantCount, setVariantCount] = useState(2)
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<Array<{ text: string; date: string; recipientName: string }>>([])

  const lastUrl = useRef(window.location.href)

  useEffect(() => {
    checkApiKey()
    loadProfile()
    loadSenderInfo()
    loadHistory()

    const handleMessage = (msg: { type: string }) => {
      if (msg.type === "OPEN_SIDEBAR") setCollapsed(false)
    }
    chrome.runtime.onMessage.addListener(handleMessage)

    const interval = setInterval(() => {
      if (window.location.href !== lastUrl.current) {
        lastUrl.current = window.location.href
        setVariants([])
        setError("")
        setHookDetails([])
        setSelectedHook(null)
        loadProfile()
      }
    }, 500)

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
      clearInterval(interval)
    }
  }, [])

  const checkApiKey = async () => {
    const result = await chrome.storage.sync.get(["ai_api_key", "coldcraft_welcomed"])
    setHasApiKey(!!result.ai_api_key)
    if (!result.coldcraft_welcomed) {
      setIsFirstVisit(true)
    }
  }

  const dismissWelcome = async () => {
    setWelcomeDismissed(true)
    await chrome.storage.sync.set({ coldcraft_welcomed: true })
  }

  const loadProfile = async (delay = 1200) => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))
    const rawText = scrapeRawPageText()
    if (rawText) {
      setRawProfileText(rawText)
      setProfileSource("text")
      setProfileWarning(false)
      const titleMatch = document.title.match(/^([^|–-]+)/)
      const nameFromTitle = titleMatch?.[1]?.trim() ?? ""
      setProfile({ ...EMPTY_PROFILE, name: nameFromTitle })
      extractHooks(rawText)
    } else {
      setProfileWarning(true)
    }
  }

  const extractHooks = async (text: string) => {
    setHookLoading(true)
    try {
      const response = await sendToBackground<
        { rawProfileText: string },
        { hookDetails?: string[]; error?: string }
      >({ name: "extractRecipientHooks", body: { rawProfileText: text } })
      if (response.hookDetails) {
        setHookDetails(response.hookDetails)
      }
    } catch {
      // Hook extraction is optional
    }
    setHookLoading(false)
  }

  const loadSenderInfo = async () => {
    const result = await chrome.storage.sync.get("sender_info")
    const local = await chrome.storage.local.get(["sender_linkedin_text", "sender_resume_text"])
    if (local.sender_linkedin_text) setSenderLinkedinText(local.sender_linkedin_text)
    if (local.sender_resume_text) setResumeText(local.sender_resume_text)
    if (result.sender_info) {
      const full: SenderInfo = {
        ...result.sender_info,
        linkedinText: local.sender_linkedin_text || undefined,
        resumeText: local.sender_resume_text || undefined
      }
      setSenderInfo(full)
      setSetupDraft(result.sender_info)
    } else {
      setShowSettings(true)
    }
  }

  const loadHistory = async () => {
    const result = await chrome.storage.local.get("message_history")
    if (result.message_history && Array.isArray(result.message_history)) {
      setHistory(result.message_history)
    }
  }

  const saveToHistory = async (text: string) => {
    const entry = { text, date: new Date().toISOString(), recipientName: profile.name || "Unknown" }
    const updated = [entry, ...history].slice(0, 50)
    setHistory(updated)
    await chrome.storage.local.set({ message_history: updated })
  }

  const saveSenderInfo = async () => {
    await chrome.storage.sync.set({ sender_info: setupDraft })
    await chrome.storage.local.set({
      sender_linkedin_text: senderLinkedinText,
      sender_resume_text: resumeText
    })
    const full: SenderInfo = { ...setupDraft, linkedinText: senderLinkedinText || undefined, resumeText: resumeText || undefined }
    setSenderInfo(full)
    setShowSettings(false)
  }

  const clearSenderInfo = async () => {
    await chrome.storage.sync.remove("sender_info")
    await chrome.storage.local.remove(["sender_linkedin_text", "sender_resume_text"])
    setSenderInfo(null)
    setSenderLinkedinText("")
    setResumeText("")
    setSetupDraft({ name: "", school: "", year: "", status: "", targetArea: "" })
    setShowSettings(false)
  }

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
        setSetupDraft((d) => ({
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

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    setSavingKey(true)
    await chrome.storage.sync.set({ ai_api_key: apiKeyInput.trim() })
    setHasApiKey(true)
    setApiKeyInput("")
    setSavingKey(false)
  }

  const loadStyleExamples = async (): Promise<StyleExample[]> => {
    const result = await chrome.storage.local.get("style_examples")
    return result.style_examples || []
  }

  const saveStyleExample = async (text: string, rating: "up" | "down", context?: string) => {
    const examples = await loadStyleExamples()
    const entry: StyleExample = { text, rating, date: new Date().toISOString(), context }
    const updated = [entry, ...examples].slice(0, 20)
    await chrome.storage.local.set({ style_examples: updated })
  }

  const generateMessage = useCallback(async () => {
    if (!senderInfo?.name) {
      setError("Fill in your info in the 'About You' section first so the message isn't signed with a fake name.")
      return
    }
    setLoading(true)
    setError("")
    setVariants([])

    const styleExamples = await loadStyleExamples()

    try {
      const response = await sendToBackground<
        GenerateMessageRequest,
        GenerateMessageResponse
      >({
        name: "generateMessage",
        body: {
          profile,
          rawProfileText: rawProfileText || undefined,
          senderInfo: senderInfo || undefined,
          referralName: referralName.trim() || undefined,
          customInstructions: customInstructions.trim() || undefined,
          selectedHook: selectedHook || undefined,
          messageType,
          variantCount,
          styleExamples: styleExamples.length > 0 ? styleExamples : undefined
        }
      })

      if (response.error === "NO_API_KEY") {
        setHasApiKey(false)
      } else if (response.error === "NO_SENDER_NAME") {
        setError("Fill in your info in the 'About You' section first.")
      } else if (response.error) {
        setError(response.error)
      } else if (response.variants) {
        setVariants(response.variants)
        if (response.variants[0]) {
          saveToHistory(response.variants[0])
        }
      }
    } catch (err) {
      setError("Failed to connect to background service. Try reloading.")
    }

    setLoading(false)
  }, [senderInfo, profile, rawProfileText, referralName, customInstructions, selectedHook, messageType, variantCount])

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const messageTypes = [
    { key: "cold" as const, label: "Cold outreach" },
    { key: "thank_you" as const, label: "Thank-you" },
    { key: "follow_up" as const, label: "Follow-up" },
    { key: "circle_back" as const, label: "Circle back" }
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .lcmg-sidebar * {
          box-sizing: border-box;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          margin: 0;
          padding: 0;
        }

        .lcmg-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 360px;
          background: #0A0F1E;
          color: #fff;
          z-index: 2147483647;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 24px rgba(0,0,0,0.4);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .lcmg-sidebar.collapsed { transform: translateX(360px); }

        .lcmg-tab {
          position: fixed; right: 0; top: 50%; transform: translateY(-50%);
          width: 44px; height: 96px; background: #6C63FF;
          border-radius: 12px 0 0 12px; display: flex; align-items: center;
          justify-content: center; cursor: pointer;
          box-shadow: -4px 0 16px rgba(108,99,255,0.4);
          flex-direction: column; gap: 6px;
          transition: background 0.15s, width 0.15s, right 0.3s cubic-bezier(0.4,0,0.2,1);
          z-index: 2147483647;
        }
        .lcmg-tab:hover { background: #7B74FF; width: 48px; }
        .lcmg-tab.sidebar-open { right: 360px; }
        .lcmg-tab-arrow { font-size: 16px; color: #fff; line-height: 1; }
        .lcmg-tab-logo { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.7); letter-spacing: 0.5px; line-height: 1; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }

        .lcmg-header { padding: 16px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .lcmg-logo { display: flex; align-items: center; gap: 8px; }
        .lcmg-logo-icon { width: 28px; height: 28px; background: #6C63FF; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; }
        .lcmg-logo-text { font-size: 13px; font-weight: 600; color: #fff; letter-spacing: -0.3px; }
        .lcmg-logo-sub { font-size: 10px; color: rgba(255,255,255,0.4); font-weight: 400; margin-top: 1px; }
        .lcmg-close-btn { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; transition: color 0.15s; font-size: 18px; line-height: 1; }
        .lcmg-close-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .lcmg-scroll { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
        .lcmg-scroll::-webkit-scrollbar { width: 4px; }
        .lcmg-scroll::-webkit-scrollbar-track { background: transparent; }
        .lcmg-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

        .lcmg-section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
        .lcmg-profile { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 12px 14px; }
        .lcmg-profile-name { font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 3px; }
        .lcmg-profile-title { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.4; }
        .lcmg-badge-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
        .lcmg-badge { font-size: 10px; padding: 2px 8px; background: rgba(108,99,255,0.15); border: 1px solid rgba(108,99,255,0.25); color: #A89EFF; border-radius: 20px; white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; cursor: pointer; transition: all 0.15s; }
        .lcmg-badge:hover { background: rgba(108,99,255,0.25); }
        .lcmg-badge.selected { background: rgba(108,99,255,0.35); border-color: #6C63FF; }
        .lcmg-warning { display: flex; align-items: flex-start; gap: 8px; background: rgba(255,170,0,0.08); border: 1px solid rgba(255,170,0,0.2); border-radius: 8px; padding: 10px 12px; font-size: 11.5px; color: #FFB84D; line-height: 1.5; }

        .lcmg-api-setup { background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.2); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .lcmg-api-setup-title { font-size: 13px; font-weight: 600; color: #fff; }
        .lcmg-api-setup-desc { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.5; }
        .lcmg-api-link { color: #6C63FF; text-decoration: none; }
        .lcmg-api-link:hover { text-decoration: underline; }
        .lcmg-api-row { display: flex; gap: 8px; }

        .lcmg-textarea { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 12.5px; padding: 10px 12px; outline: none; resize: none; font-family: inherit; line-height: 1.5; transition: border-color 0.15s; }
        .lcmg-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .lcmg-textarea:focus { border-color: #6C63FF; }

        .lcmg-btn-primary { width: 100%; background: #6C63FF; border: none; color: #fff; font-size: 13.5px; font-weight: 600; padding: 11px 16px; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; }
        .lcmg-btn-primary:hover:not(:disabled) { background: #7B74FF; transform: translateY(-1px); }
        .lcmg-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .lcmg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .lcmg-btn-ghost { background: none; border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); font-size: 12.5px; font-weight: 500; padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
        .lcmg-btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: #fff; background: rgba(255,255,255,0.04); }
        .lcmg-btn-sm { background: rgba(108,99,255,0.15); border: 1px solid rgba(108,99,255,0.3); color: #A89EFF; font-size: 11.5px; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .lcmg-btn-sm:hover { background: rgba(108,99,255,0.25); }
        .lcmg-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 12.5px; padding: 9px 12px; outline: none; font-family: inherit; transition: border-color 0.15s; }
        .lcmg-input:focus { border-color: #6C63FF; }
        .lcmg-input::placeholder { color: rgba(255,255,255,0.25); }

        .lcmg-output { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; }
        .lcmg-output-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .lcmg-output-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.6px; }
        .lcmg-output-actions { display: flex; gap: 6px; align-items: center; }
        .lcmg-output-textarea { width: 100%; background: transparent; border: none; color: rgba(255,255,255,0.88); font-size: 13px; line-height: 1.65; padding: 14px; resize: none; font-family: 'Inter', sans-serif; outline: none; min-height: 160px; }

        .lcmg-error { background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.2); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
        .lcmg-error-text { font-size: 12px; color: #FF8080; line-height: 1.5; }

        .lcmg-skeleton { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
        .lcmg-skeleton-line { height: 12px; border-radius: 6px; background: linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 100%); background-size: 200% 100%; animation: lcmg-shimmer 1.5s infinite; }
        @keyframes lcmg-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .lcmg-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0 -20px; }
        .lcmg-copied-badge { display: inline-flex; align-items: center; gap: 4px; color: #5FD98C; font-size: 11.5px; font-weight: 500; }
        .lcmg-no-profile { text-align: center; padding: 20px 0; color: rgba(255,255,255,0.3); font-size: 12px; line-height: 1.5; }
        .lcmg-setup-desc { font-size: 11.5px; color: rgba(255,255,255,0.45); line-height: 1.5; }
        .lcmg-field { display: flex; flex-direction: column; gap: 4px; }
        .lcmg-field-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(255,255,255,0.35); }

        .lcmg-settings { position: absolute; inset: 0; background: #0A0F1E; z-index: 10; display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); }
        .lcmg-settings.open { transform: translateX(0); }
        .lcmg-settings-header { padding: 16px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .lcmg-settings-back { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 4px; border-radius: 4px; transition: color 0.15s; }
        .lcmg-settings-back:hover { color: #fff; }
        .lcmg-settings-title { font-size: 13px; font-weight: 600; color: #fff; }
        .lcmg-settings-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }

        .lcmg-you-pill { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.15s; width: 100%; text-align: left; }
        .lcmg-you-pill:hover { background: rgba(255,255,255,0.07); }
        .lcmg-you-pill-avatar { width: 28px; height: 28px; background: #6C63FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .lcmg-you-pill-info { flex: 1; min-width: 0; }
        .lcmg-you-pill-name { font-size: 12.5px; font-weight: 600; color: #fff; }
        .lcmg-you-pill-sub { font-size: 11px; color: rgba(255,255,255,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lcmg-you-pill-arrow { font-size: 12px; color: rgba(255,255,255,0.25); flex-shrink: 0; }

        .lcmg-gear-btn { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 4px; border-radius: 4px; font-size: 15px; line-height: 1; display: flex; align-items: center; transition: color 0.15s; }
        .lcmg-gear-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .lcmg-welcome { background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.2); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .lcmg-welcome-title { font-size: 14px; font-weight: 600; color: #fff; }
        .lcmg-welcome-text { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.6; }
        .lcmg-welcome-step { display: flex; align-items: flex-start; gap: 8px; }
        .lcmg-welcome-num { width: 18px; height: 18px; background: rgba(108,99,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #A89EFF; flex-shrink: 0; margin-top: 1px; }
        .lcmg-welcome-step-text { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.5; }

        .lcmg-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .lcmg-chip { font-size: 11px; padding: 4px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); border-radius: 20px; cursor: pointer; transition: all 0.15s; }
        .lcmg-chip:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .lcmg-chip.active { background: rgba(108,99,255,0.2); border-color: rgba(108,99,255,0.4); color: #A89EFF; }

        .lcmg-more-toggle { font-size: 11px; color: rgba(255,255,255,0.4); cursor: pointer; background: none; border: none; font-family: inherit; transition: color 0.15s; display: flex; align-items: center; gap: 4px; }
        .lcmg-more-toggle:hover { color: rgba(255,255,255,0.7); }

        .lcmg-variant-controls { display: flex; align-items: center; gap: 8px; }
        .lcmg-variant-btn { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.15s; }
        .lcmg-variant-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .lcmg-variant-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .lcmg-thumb-btn { background: none; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 3px 6px; cursor: pointer; font-size: 12px; transition: all 0.15s; color: rgba(255,255,255,0.4); }
        .lcmg-thumb-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .lcmg-footer { padding: 10px 20px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: center; flex-shrink: 0; }
        .lcmg-footer-link { font-size: 10px; color: rgba(255,255,255,0.25); text-decoration: none; transition: color 0.15s; cursor: pointer; background: none; border: none; font-family: inherit; }
        .lcmg-footer-link:hover { color: rgba(255,255,255,0.5); }
      `}</style>

      <div
        className={`lcmg-tab${!collapsed ? " sidebar-open" : ""}`}
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Open ColdCraft" : "Close ColdCraft"}>
        <span className="lcmg-tab-arrow">{collapsed ? "◀" : "▶"}</span>
        <span className="lcmg-tab-logo">AI</span>
      </div>

      <div className={`lcmg-sidebar${collapsed ? " collapsed" : ""}`}>

        {/* Header */}
        <div className="lcmg-header">
          <div className="lcmg-logo">
            <div className="lcmg-logo-icon">{"✦"}</div>
            <div>
              <div className="lcmg-logo-text">ColdCraft</div>
              <div className="lcmg-logo-sub">AI Message Generator</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="lcmg-gear-btn" onClick={() => setShowHistory(true)} title="History">
              {"☰"}
            </button>
            <button className="lcmg-gear-btn" onClick={() => { setSetupDraft(senderInfo ?? setupDraft); setShowSettings(true) }} title="Your Info">
              {"⚙"}
            </button>
            <button className="lcmg-close-btn" onClick={() => setCollapsed(true)}>{"✕"}</button>
          </div>
        </div>

        {/* Settings panel */}
        <div className={`lcmg-settings${showSettings ? " open" : ""}`}>
          <div className="lcmg-settings-header">
            <button className="lcmg-settings-back" onClick={() => setShowSettings(false)}>{"←"}</button>
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
            <button className="lcmg-btn-primary" onClick={saveSenderInfo} disabled={!setupDraft.name.trim() || !setupDraft.school.trim()}>Save</button>
            {senderInfo && (
              <button className="lcmg-btn-ghost" style={{ justifyContent: "center", color: "rgba(255,80,80,0.7)", borderColor: "rgba(255,80,80,0.2)" }} onClick={clearSenderInfo}>Clear my info</button>
            )}
            <div className="lcmg-divider" style={{ margin: "12px 0" }} />
            <div className="lcmg-field-label">API Key</div>
            {hasApiKey ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Key saved {"✓"}</span>
                <button className="lcmg-btn-ghost" style={{ fontSize: 11 }} onClick={async () => { await chrome.storage.sync.remove("ai_api_key"); setHasApiKey(false); setApiKeyInput("") }}>Change</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 6, lineHeight: 1.5 }}>
                  Get a key at <a className="lcmg-api-link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>
                </div>
                <div className="lcmg-api-row">
                  <input className="lcmg-input" type="password" placeholder="sk-ant-..." value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveApiKey()} />
                  <button className="lcmg-btn-sm" onClick={saveApiKey} disabled={savingKey || !apiKeyInput.trim()}>{savingKey ? "..." : "Save"}</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* History panel */}
        <div className={`lcmg-settings${showHistory ? " open" : ""}`}>
          <div className="lcmg-settings-header">
            <button className="lcmg-settings-back" onClick={() => setShowHistory(false)}>{"←"}</button>
            <span className="lcmg-settings-title">Message History</span>
          </div>
          <div className="lcmg-settings-body">
            {history.length === 0 ? (
              <div className="lcmg-no-profile">No messages generated yet.</div>
            ) : (
              history.map((h, i) => (
                <div key={i} className="lcmg-profile" style={{ cursor: "pointer" }} onClick={() => { setVariants([h.text]); setShowHistory(false) }}>
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

        <div className="lcmg-scroll">
          {/* Welcome card */}
          {isFirstVisit && !welcomeDismissed && (
            <div className="lcmg-welcome">
              <div className="lcmg-welcome-title">Welcome to ColdCraft</div>
              <div className="lcmg-welcome-text">ColdCraft uses AI to write personalized cold outreach messages. You'll need an API key to get started. Think of it as a password that lets the extension talk to the AI.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "4px 0" }}>
                <div className="lcmg-welcome-step">
                  <div className="lcmg-welcome-num">1</div>
                  <div className="lcmg-welcome-step-text">Go to <a className="lcmg-api-link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a> and create a free account (takes 1 minute)</div>
                </div>
                <div className="lcmg-welcome-step">
                  <div className="lcmg-welcome-num">2</div>
                  <div className="lcmg-welcome-step-text">Click "Create Key", copy it, and paste it in Settings below</div>
                </div>
                <div className="lcmg-welcome-step">
                  <div className="lcmg-welcome-num">3</div>
                  <div className="lcmg-welcome-step-text">Each message costs less than a penny. Most users spend under $1/month.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a className="lcmg-btn-primary" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ textDecoration: "none", textAlign: "center" }}>Get API Key</a>
                <button className="lcmg-btn-ghost" onClick={dismissWelcome}>I have one</button>
              </div>
            </div>
          )}

          {/* Profile section */}
          <div>
            <div className="lcmg-section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Profile Detected</span>
              {profileSource === "text" && <span style={{ color: "#5FD98C", fontSize: 9, fontWeight: 600, letterSpacing: "0.5px" }}>{"✓"} LOADED</span>}
            </div>
            {profile.name || rawProfileText ? (
              <div className="lcmg-profile">
                {profile.name && <div className="lcmg-profile-name">{profile.name}</div>}
                {rawProfileText && !profile.skills.length && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>Profile text captured, AI will extract details</div>
                )}
                {(hookLoading || hookDetails.length > 0) && (
                  <div className="lcmg-badge-row" style={{ marginTop: 8 }}>
                    {hookLoading ? (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Finding hook details{"…"}</span>
                    ) : (
                      hookDetails.map((h) => (
                        <span key={h} className={`lcmg-badge${selectedHook === h ? " selected" : ""}`} onClick={() => setSelectedHook(selectedHook === h ? null : h)}>{h}</span>
                      ))
                    )}
                  </div>
                )}
                <button className="lcmg-btn-ghost" style={{ marginTop: 6, fontSize: 11 }} onClick={() => loadProfile(0)}>{"↺"} Rescrape</button>
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

          <div className="lcmg-divider" />

          {/* You pill */}
          {senderInfo ? (
            <button className="lcmg-you-pill" onClick={() => { setSetupDraft(senderInfo); setShowSettings(true) }}>
              <div className="lcmg-you-pill-avatar">{senderInfo.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
              <div className="lcmg-you-pill-info">
                <div className="lcmg-you-pill-name">{senderInfo.name}</div>
                <div className="lcmg-you-pill-sub">{[senderInfo.year, senderInfo.school, senderInfo.targetArea ? `· ${senderInfo.targetArea}` : ""].filter(Boolean).join(" ")}</div>
              </div>
              <span className="lcmg-you-pill-arrow">{"✎"}</span>
            </button>
          ) : (
            <button className="lcmg-you-pill" onClick={() => setShowSettings(true)}>
              <div className="lcmg-you-pill-avatar" style={{ background: "rgba(255,255,255,0.1)" }}>?</div>
              <div className="lcmg-you-pill-info">
                <div className="lcmg-you-pill-name" style={{ color: "rgba(255,255,255,0.5)" }}>Set up your info</div>
                <div className="lcmg-you-pill-sub">Required before generating</div>
              </div>
              <span className="lcmg-you-pill-arrow">{"→"}</span>
            </button>
          )}

          <div className="lcmg-divider" />

          {/* API Key missing */}
          {hasApiKey === false && (
            <div className="lcmg-api-setup">
              <div className="lcmg-api-setup-title">API key needed</div>
              <div className="lcmg-api-setup-desc">
                ColdCraft needs an API key to generate messages. It's like a password that connects to the AI.{" "}
                <a className="lcmg-api-link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Get one here</a>
                {" "}(free to create, costs fractions of a cent per message).
              </div>
              <button className="lcmg-btn-sm" onClick={() => { setSetupDraft(senderInfo || { name: "", school: "", year: "", status: "", targetArea: "" }); setShowSettings(true) }}>Add API Key in Settings</button>
            </div>
          )}

          {/* Message type */}
          <div>
            <div className="lcmg-section-label">Message type</div>
            <div className="lcmg-chip-row">
              {messageTypes.map((t) => (
                <span key={t.key} className={`lcmg-chip${messageType === t.key ? " active" : ""}`} onClick={() => setMessageType(t.key)}>{t.label}</span>
              ))}
            </div>
          </div>

          {/* More options toggle */}
          <button className="lcmg-more-toggle" onClick={() => setShowMoreOptions(!showMoreOptions)}>
            {showMoreOptions ? "▾" : "▸"} More options
          </button>

          {showMoreOptions && (
            <>
              {/* Referral */}
              <div>
                <div className="lcmg-section-label">Referral Name (optional)</div>
                <input className="lcmg-input" style={{ width: "100%" }} type="text" placeholder="e.g. John Smith suggested I reach out" value={referralName} onChange={(e) => setReferralName(e.target.value)} />
              </div>

              {/* Extra context */}
              <div>
                <div className="lcmg-section-label">Extra Context (optional)</div>
                <textarea className="lcmg-textarea" rows={2} placeholder="Anything specific to mention…" value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} />
              </div>
            </>
          )}

          {/* Variant count + Generate */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="lcmg-btn-primary"
              style={{ flex: 1 }}
              onClick={generateMessage}
              disabled={loading || hasApiKey === false || !senderInfo?.name}>
              {loading ? <>Generating...</> : !senderInfo?.name ? <>Set up your info first</> : <>{"✦"} Generate Message</>}
            </button>
            <div className="lcmg-variant-controls">
              <button className="lcmg-variant-btn" disabled={variantCount <= 1} onClick={() => setVariantCount((c) => Math.max(1, c - 1))}>{"−"}</button>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", minWidth: 8, textAlign: "center" }}>{variantCount}</span>
              <button className="lcmg-variant-btn" disabled={variantCount >= 5} onClick={() => setVariantCount((c) => Math.min(5, c + 1))}>+</button>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: -8 }}>
            {variantCount === 1 ? "1 variant" : `${variantCount} variants`}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="lcmg-skeleton">
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Crafting hooks...</div>
              <div className="lcmg-skeleton-line" style={{ width: "90%" }} />
              <div className="lcmg-skeleton-line" style={{ width: "75%" }} />
              <div className="lcmg-skeleton-line" style={{ width: "85%" }} />
              <div className="lcmg-skeleton-line" style={{ width: "60%" }} />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="lcmg-error">
              <div className="lcmg-error-text">{"⚠"} {error}</div>
              {error.includes("401") && (
                <div style={{ fontSize: 11, color: "rgba(255,128,128,0.7)", lineHeight: 1.5 }}>
                  Your API key is invalid or expired. Open Settings to update it, or <a className="lcmg-api-link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: "#A89EFF" }}>get a new key</a>.
                </div>
              )}
              {error.includes("429") && (
                <div style={{ fontSize: 11, color: "rgba(255,128,128,0.7)", lineHeight: 1.5 }}>
                  Rate limited. Wait a moment and try again, or check your <a className="lcmg-api-link" href="https://console.anthropic.com/settings/limits" target="_blank" rel="noreferrer" style={{ color: "#A89EFF" }}>usage limits</a>.
                </div>
              )}
              {error.toLowerCase().includes("insufficient") && (
                <div style={{ fontSize: 11, color: "rgba(255,128,128,0.7)", lineHeight: 1.5 }}>
                  Your API account needs credits. Add billing at <a className="lcmg-api-link" href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer" style={{ color: "#A89EFF" }}>console.anthropic.com/settings/billing</a>.
                </div>
              )}
              {(error.includes("Network error") || error.includes("Failed to fetch")) && (
                <div style={{ fontSize: 11, color: "rgba(255,128,128,0.7)", lineHeight: 1.5 }}>
                  Check your internet connection. If you're on a VPN or corporate network, the API might be blocked.
                </div>
              )}
              <button className="lcmg-btn-ghost" onClick={generateMessage}>{"↺"} Retry</button>
            </div>
          )}

          {/* Variants output */}
          {variants.length > 0 && !loading && variants.map((variant, index) => (
            <div key={index} className="lcmg-output">
              <div className="lcmg-output-header">
                <span className="lcmg-output-label">
                  {variants.length > 1 ? `Variant ${index + 1}` : "Generated Message"}
                </span>
                <div className="lcmg-output-actions">
                  <button className="lcmg-thumb-btn" title="Like this style" onClick={() => saveStyleExample(variant, "up")}>{"👍"}</button>
                  <button className="lcmg-thumb-btn" title="Dislike this style" onClick={() => saveStyleExample(variant, "down")}>{"👎"}</button>
                  {copiedIndex === index ? (
                    <span className="lcmg-copied-badge">{"✓"} Copied!</span>
                  ) : (
                    <button className="lcmg-btn-ghost" onClick={() => copyToClipboard(variant, index)}>Copy</button>
                  )}
                </div>
              </div>
              <textarea
                className="lcmg-output-textarea"
                value={variant}
                onChange={(e) => {
                  const updated = [...variants]
                  updated[index] = e.target.value
                  setVariants(updated)
                }}
                rows={8}
              />
              <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.35)", padding: "0 14px 10px" }}>
                {variant.trim().split(/\s+/).length} words
              </div>
            </div>
          ))}

          {variants.length > 0 && !loading && (
            <button className="lcmg-btn-ghost" style={{ justifyContent: "center" }} onClick={generateMessage}>{"↺"} Regenerate</button>
          )}

          <div style={{ height: 8 }} />
        </div>

        {/* Footer */}
        <div className="lcmg-footer">
          <a className="lcmg-footer-link" href="https://github.com/HumbleOrigin/ColdCraft/issues/new" target="_blank" rel="noreferrer">Report a problem</a>
        </div>
      </div>
    </>
  )
}

export default Sidebar
