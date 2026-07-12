import { sendToBackground } from "@plasmohq/messaging"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { Component, useCallback, useEffect, useRef, useState } from "react"
import type { ErrorInfo, ReactNode } from "react"
import type { GenerateMessageRequest, GenerateMessageResponse, SenderInfo, StyleExample } from "../background/messages/generateMessage"
import { ANTHROPIC_MODELS, OPENAI_MODELS, type ModelOption } from "../background/aiClient"
import SettingsPanel from "./components/SettingsPanel"
import TrackerPanel from "./components/TrackerPanel"
import TrainingDataPanel from "./components/TrainingDataPanel"
import MessageOutput from "./components/MessageOutput"
import ProfileSection from "./components/ProfileSection"

class SidebarErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ColdCraft sidebar error:", error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: "#FF8080", fontFamily: "Inter, sans-serif", fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>Something went wrong</div>
          <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>ColdCraft hit an unexpected error. Click below to reload.</div>
          <button onClick={() => this.setState({ hasError: false })} style={{ background: "#2563EB", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Reload sidebar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
  const [conversationContext, setConversationContext] = useState("")
  const [variantCount, setVariantCount] = useState(2)
  // LinkedIn caps connection-request notes at 300 characters; regular messages have no practical limit
  const [sendFormat, setSendFormat] = useState<"note" | "message">("note")
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  const [showTracker, setShowTracker] = useState(false)
  const [followUpCount, setFollowUpCount] = useState(0)

  const [showDropdown, setShowDropdown] = useState(false)
  const [showTrainingData, setShowTrainingData] = useState(false)
  const [styleExamples, setStyleExamples] = useState<StyleExample[]>([])
  const [styleTrainingEnabled, setStyleTrainingEnabled] = useState(false)
  const [ratedVariants, setRatedVariants] = useState<Record<number, "up" | "down">>({})
  const [variantContexts, setVariantContexts] = useState<Record<number, string>>({})

  const [tokenUsage, setTokenUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null)
  const [activeModel, setActiveModel] = useState<ModelOption | null>(null)
  const variantsEdited = useRef(false)
  const [progressText, setProgressText] = useState("")

  const lastUrl = useRef(window.location.href)

  useEffect(() => {
    checkApiKey()
    loadProfile()
    loadSenderInfo()
    loadTrainingData()

    const handleMessage = (msg: { type: string }) => {
      if (msg.type === "OPEN_SIDEBAR") setCollapsed(false)
    }
    chrome.runtime.onMessage.addListener(handleMessage)

    const handleNavigation = () => {
      if (window.location.href !== lastUrl.current) {
        lastUrl.current = window.location.href
        setVariants([])
        setError("")
        setHookDetails([])
        setSelectedHook(null)
        setTokenUsage(null)
        setConversationContext("")
        setRatedVariants({})
        setVariantContexts({})
        variantsEdited.current = false
        loadProfile()
      }
    }
    window.addEventListener("popstate", handleNavigation)
    window.addEventListener("visibilitychange", handleNavigation)
    const observer = new MutationObserver(handleNavigation)
    observer.observe(document.querySelector("head > title") || document.head, { childList: true, subtree: true, characterData: true })

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
      window.removeEventListener("popstate", handleNavigation)
      window.removeEventListener("visibilitychange", handleNavigation)
      observer.disconnect()
    }
  }, [])

  const checkApiKey = async () => {
    const local = await chrome.storage.local.get("ai_api_key")
    const result = await chrome.storage.sync.get(["ai_api_key", "ai_provider", "ai_model", "coldcraft_welcomed"])
    // ai_api_key in sync is a pre-1.0.3 leftover; loadAIConfig migrates it to local
    setHasApiKey(!!local.ai_api_key || !!result.ai_api_key)
    if (!result.coldcraft_welcomed) {
      setIsFirstVisit(true)
    }
    const provider = result.ai_provider || "anthropic"
    const modelId = result.ai_model || (provider === "openai" ? "gpt-4o" : "claude-sonnet-4-6")
    const models = provider === "anthropic" ? ANTHROPIC_MODELS : OPENAI_MODELS
    setActiveModel(models.find((m) => m.id === modelId) || models[0])
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

  const trackCopiedMessage = async (messageText: string) => {
    const url = window.location.href
    const slug = url.match(/linkedin\.com\/in\/([^/]+)/)?.[1] || ""
    const linkedinUrl = slug ? `https://www.linkedin.com/in/${slug}/` : url
    try {
      await sendToBackground({
        name: "trackContact",
        body: {
          linkedinUrl,
          name: profile.name || "Unknown",
          company: profile.company || "",
          title: profile.title || "",
          messageText,
          messageType,
        }
      })
    } catch {}
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

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) return
    setSavingKey(true)
    await chrome.storage.local.set({ ai_api_key: apiKeyInput.trim() })
    setHasApiKey(true)
    setApiKeyInput("")
    setSavingKey(false)
  }

  const loadTrainingData = async () => {
    const result = await chrome.storage.local.get(["style_examples", "style_training_enabled"])
    if (Array.isArray(result.style_examples)) setStyleExamples(result.style_examples)
    setStyleTrainingEnabled(!!result.style_training_enabled)
  }

  const persistStyleExamples = async (updated: StyleExample[]) => {
    setStyleExamples(updated)
    await chrome.storage.local.set({ style_examples: updated })
  }

  const rateVariant = async (index: number, rating: "up" | "down") => {
    const msg = variants[index] ?? ""
    if (!msg.trim()) return
    const alreadyRated = ratedVariants[index]
    if (alreadyRated === rating) {
      // toggle off: remove the rating and its example
      const updated = { ...ratedVariants }
      delete updated[index]
      setRatedVariants(updated)
      const updatedCtx = { ...variantContexts }
      delete updatedCtx[index]
      setVariantContexts(updatedCtx)
      await persistStyleExamples(styleExamples.filter((e) => e.text !== msg))
      return
    }
    const filtered = styleExamples.filter((e) => e.text !== msg)
    if (filtered.length >= 10 && !alreadyRated) return // library full
    if (alreadyRated) {
      const updatedCtx = { ...variantContexts }
      delete updatedCtx[index]
      setVariantContexts(updatedCtx)
    }
    setRatedVariants({ ...ratedVariants, [index]: rating })
    const entry: StyleExample = { text: msg, rating, date: new Date().toISOString() }
    await persistStyleExamples([...filtered, entry].slice(-10))
  }

  const contextTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const commitVariantContext = (index: number, context: string) => {
    const msg = variants[index] ?? ""
    persistStyleExamples(styleExamples.map((e) => e.text === msg ? { ...e, context: context.trim() || undefined } : e))
  }
  const handleVariantContextChange = (index: number, context: string) => {
    setVariantContexts({ ...variantContexts, [index]: context })
    if (contextTimers.current[index]) clearTimeout(contextTimers.current[index])
    contextTimers.current[index] = setTimeout(() => commitVariantContext(index, context), 1000)
  }
  const handleVariantContextCommit = (index: number) => {
    if (contextTimers.current[index]) clearTimeout(contextTimers.current[index])
    commitVariantContext(index, variantContexts[index] || "")
  }

  const generatingRef = useRef(false)
  const generateMessage = useCallback(async () => {
    if (generatingRef.current) return
    if (!senderInfo?.name) {
      setError("Fill in your info in the 'About You' section first so the message isn't signed with a fake name.")
      return
    }

    if (variantsEdited.current && variants.length > 0) {
      const confirmed = window.confirm("You have unsaved edits. Copy them first?")
      if (!confirmed) return
    }

    generatingRef.current = true
    setLoading(true)
    setError("")
    setVariants([])
    setTokenUsage(null)
    setRatedVariants({})
    setVariantContexts({})
    variantsEdited.current = false

    const progressSteps = [
      "Analyzing profile...",
      `Generating variant 1 of ${variantCount}...`,
      ...(variantCount > 1 ? [`Generating variant ${variantCount} of ${variantCount}...`] : []),
      "Polishing..."
    ]
    let stepIndex = 0
    setProgressText(progressSteps[0])
    const progressInterval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, progressSteps.length - 1)
      setProgressText(progressSteps[stepIndex])
    }, 3000)

    // examples only steer generations while style training is switched on
    const activeExamples = styleTrainingEnabled ? styleExamples : []

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
          conversationContext: conversationContext.trim() || undefined,
          variantCount,
          styleExamples: activeExamples.length > 0 ? activeExamples : undefined
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
        if (response.usage) setTokenUsage(response.usage)
      }
    } catch (err) {
      setError("Failed to connect to background service. Try reloading.")
    }

    clearInterval(progressInterval)
    setProgressText("")
    generatingRef.current = false
    setLoading(false)
  }, [senderInfo, profile, rawProfileText, referralName, customInstructions, selectedHook, messageType, conversationContext, variantCount, variants, styleExamples, styleTrainingEnabled])

  const handleVariantEdit = (index: number, text: string) => {
    variantsEdited.current = true
    const updated = [...variants]
    updated[index] = text
    setVariants(updated)
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
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 400 700;
          font-display: swap;
          src: url('${chrome.runtime.getURL("assets/fonts/inter-latin.woff2")}') format('woff2');
        }

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
          width: min(360px, 90vw);
          background: #0A0F1E;
          color: #fff;
          z-index: 2147483647;
          display: flex;
          flex-direction: column;
          box-shadow: -4px 0 24px rgba(0,0,0,0.4);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .lcmg-sidebar.collapsed { transform: translateX(min(360px, 90vw)); }

        .lcmg-tab {
          position: fixed; right: 0; top: 50%; transform: translateY(-50%);
          width: 44px; height: 96px; background: #2563EB;
          border-radius: 12px 0 0 12px; display: flex; align-items: center;
          justify-content: center; cursor: pointer;
          box-shadow: -4px 0 16px rgba(37,99,235,0.4);
          flex-direction: column; gap: 6px;
          transition: background 0.15s, width 0.15s, right 0.3s cubic-bezier(0.4,0,0.2,1);
          z-index: 2147483647;
        }
        .lcmg-tab:hover { background: #3b7cf7; width: 48px; }
        .lcmg-tab.sidebar-open { right: min(360px, 90vw); }
        .lcmg-tab-arrow { font-size: 16px; color: #fff; line-height: 1; }
        .lcmg-tab-logo { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.7); letter-spacing: 0.5px; line-height: 1; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }

        .lcmg-header { padding: 16px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .lcmg-logo { display: flex; align-items: center; gap: 8px; }
        .lcmg-logo-icon { width: 28px; height: 28px; background: #2563EB; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; }
        .lcmg-logo-text { font-size: 13px; font-weight: 600; color: #fff; letter-spacing: -0.3px; }
        .lcmg-logo-sub { font-size: 10px; color: rgba(255,255,255,0.4); font-weight: 400; margin-top: 1px; }
        .lcmg-close-btn { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 8px; border-radius: 6px; display: flex; align-items: center; transition: color 0.15s; font-size: 18px; line-height: 1; }
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
        .lcmg-badge { font-size: 10px; padding: 2px 8px; background: rgba(37,99,235,0.15); border: 1px solid rgba(37,99,235,0.25); color: #93c5fd; border-radius: 20px; white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; cursor: pointer; transition: all 0.15s; }
        .lcmg-badge:hover { background: rgba(37,99,235,0.25); }
        .lcmg-badge.selected { background: rgba(37,99,235,0.35); border-color: #2563EB; }
        .lcmg-warning { display: flex; align-items: flex-start; gap: 8px; background: rgba(255,170,0,0.08); border: 1px solid rgba(255,170,0,0.2); border-radius: 8px; padding: 10px 12px; font-size: 11.5px; color: #FFB84D; line-height: 1.5; }

        .lcmg-api-setup { background: rgba(37,99,235,0.08); border: 1px solid rgba(37,99,235,0.2); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .lcmg-api-setup-title { font-size: 13px; font-weight: 600; color: #fff; }
        .lcmg-api-setup-desc { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.5; }
        .lcmg-api-link { color: #2563EB; text-decoration: none; }
        .lcmg-api-link:hover { text-decoration: underline; }
        .lcmg-api-row { display: flex; gap: 8px; }

        .lcmg-textarea { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 12.5px; padding: 10px 12px; outline: none; resize: none; font-family: inherit; line-height: 1.5; transition: border-color 0.15s; }
        .lcmg-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .lcmg-textarea:focus { border-color: #2563EB; }

        .lcmg-btn-primary { width: 100%; background: #2563EB; border: none; color: #fff; font-size: 13.5px; font-weight: 600; padding: 11px 16px; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; }
        .lcmg-btn-primary:hover:not(:disabled) { background: #3b7cf7; transform: translateY(-1px); }
        .lcmg-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .lcmg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .lcmg-btn-primary:focus-visible, .lcmg-btn-ghost:focus-visible, .lcmg-btn-sm:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
        .lcmg-close-btn:focus-visible, .lcmg-gear-btn:focus-visible, .lcmg-settings-back:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
        .lcmg-variant-btn:focus-visible, .lcmg-chip:focus-visible, .lcmg-badge:focus-visible, .lcmg-you-pill:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
        .lcmg-btn-ghost { background: none; border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.7); font-size: 12.5px; font-weight: 500; padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 5px; white-space: nowrap; }
        .lcmg-btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: #fff; background: rgba(255,255,255,0.04); }
        .lcmg-btn-sm { background: rgba(37,99,235,0.15); border: 1px solid rgba(37,99,235,0.3); color: #93c5fd; font-size: 11.5px; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .lcmg-btn-sm:hover { background: rgba(37,99,235,0.25); }
        .lcmg-input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 12.5px; padding: 9px 12px; outline: none; font-family: inherit; transition: border-color 0.15s; }
        .lcmg-input:focus { border-color: #2563EB; }
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
        @media (prefers-reduced-motion: reduce) {
          .lcmg-sidebar, .lcmg-settings, .lcmg-tab { transition: none; }
          .lcmg-skeleton-line { animation: none; }
          .lcmg-btn-primary, .lcmg-btn-ghost, .lcmg-btn-sm, .lcmg-badge, .lcmg-chip { transition: none; }
        }

        .lcmg-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0 -20px; }
        .lcmg-copied-badge { display: inline-flex; align-items: center; gap: 4px; color: #5FD98C; font-size: 11.5px; font-weight: 500; }
        .lcmg-no-profile { text-align: center; padding: 20px 0; color: rgba(255,255,255,0.3); font-size: 12px; line-height: 1.5; }
        .lcmg-setup-desc { font-size: 11.5px; color: rgba(255,255,255,0.45); line-height: 1.5; }
        .lcmg-field { display: flex; flex-direction: column; gap: 4px; }
        .lcmg-field-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(255,255,255,0.35); }

        .lcmg-settings { position: absolute; inset: 0; background: #0A0F1E; z-index: 10; display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); }
        .lcmg-settings.open { transform: translateX(0); }
        .lcmg-settings-header { padding: 16px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .lcmg-settings-back { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 16px; line-height: 1; padding: 8px; border-radius: 6px; transition: color 0.15s; }
        .lcmg-settings-back:hover { color: #fff; }
        .lcmg-settings-title { font-size: 13px; font-weight: 600; color: #fff; }
        .lcmg-settings-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }

        .lcmg-you-pill { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.15s; width: 100%; text-align: left; }
        .lcmg-you-pill:hover { background: rgba(255,255,255,0.07); }
        .lcmg-you-pill-avatar { width: 28px; height: 28px; background: #2563EB; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .lcmg-you-pill-info { flex: 1; min-width: 0; }
        .lcmg-you-pill-name { font-size: 12.5px; font-weight: 600; color: #fff; }
        .lcmg-you-pill-sub { font-size: 11px; color: rgba(255,255,255,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lcmg-you-pill-arrow { font-size: 12px; color: rgba(255,255,255,0.25); flex-shrink: 0; }

        .lcmg-gear-btn { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 8px; border-radius: 6px; font-size: 15px; line-height: 1; display: flex; align-items: center; transition: color 0.15s; }
        .lcmg-gear-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .lcmg-welcome { background: rgba(37,99,235,0.08); border: 1px solid rgba(37,99,235,0.2); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .lcmg-welcome-title { font-size: 14px; font-weight: 600; color: #fff; }
        .lcmg-welcome-text { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.6; }
        .lcmg-welcome-step { display: flex; align-items: flex-start; gap: 8px; }
        .lcmg-welcome-num { width: 18px; height: 18px; background: rgba(37,99,235,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #93c5fd; flex-shrink: 0; margin-top: 1px; }
        .lcmg-welcome-step-text { font-size: 12px; color: rgba(255,255,255,0.6); line-height: 1.5; }

        .lcmg-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .lcmg-chip { font-size: 11px; padding: 4px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); border-radius: 20px; cursor: pointer; transition: all 0.15s; }
        .lcmg-chip:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .lcmg-chip.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #93c5fd; }

        .lcmg-more-toggle { font-size: 11px; color: rgba(255,255,255,0.4); cursor: pointer; background: none; border: none; font-family: inherit; transition: color 0.15s; display: flex; align-items: center; gap: 4px; }
        .lcmg-more-toggle:hover { color: rgba(255,255,255,0.7); }

        .lcmg-variant-controls { display: flex; align-items: center; gap: 8px; }
        .lcmg-variant-btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.15s; }
        .lcmg-variant-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .lcmg-variant-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .lcmg-rate-btn { background: none; border: 1px solid transparent; border-radius: 4px; cursor: pointer; padding: 3px 5px; color: rgba(255,255,255,0.35); transition: color 0.15s, border-color 0.15s, background 0.15s; line-height: 1; display: flex; align-items: center; justify-content: center; }
        .lcmg-rate-btn:hover { color: rgba(255,255,255,0.6); }
        .lcmg-rate-btn.active-up { color: #5FD98C; border-color: rgba(95,217,140,0.3); background: rgba(95,217,140,0.08); }
        .lcmg-rate-btn.active-down { color: #f87171; border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.08); }
        .lcmg-rate-btn:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }

        /* Dropdown menu */
        .lcmg-dropdown-wrap { position: relative; }
        .lcmg-dropdown-backdrop { position: fixed; inset: 0; z-index: 9; }
        .lcmg-dropdown { position: absolute; top: 100%; right: 0; margin-top: 4px; background: #141929; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 10; min-width: 180px; padding: 4px; overflow: hidden; }
        .lcmg-dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: none; border: none; color: rgba(255,255,255,0.7); font-size: 12.5px; font-family: inherit; cursor: pointer; border-radius: 6px; transition: background 0.12s, color 0.12s; text-align: left; }
        .lcmg-dropdown-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .lcmg-dropdown-item:focus-visible { outline: 2px solid #93c5fd; outline-offset: -2px; }
        .lcmg-dropdown-icon { width: 16px; height: 16px; color: rgba(255,255,255,0.4); flex-shrink: 0; }

        /* Training Data panel */
        .lcmg-training-section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.3); margin-top: 8px; }
        .lcmg-training-disclaimer { font-size: 10.5px; color: rgba(255,255,255,0.3); line-height: 1.5; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; }

        /* Condensed cards */
        .lcmg-card-collapsed { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px 12px; cursor: pointer; transition: background 0.12s, border-color 0.12s; }
        .lcmg-card-collapsed:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
        .lcmg-card-collapsed.expanded { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); cursor: default; }
        .lcmg-card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .lcmg-card-name { font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .lcmg-card-meta { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .lcmg-card-date { font-size: 10px; color: rgba(255,255,255,0.25); }
        .lcmg-card-chevron { font-size: 10px; color: rgba(255,255,255,0.2); transition: transform 0.2s; }
        .lcmg-card-chevron.open { transform: rotate(180deg); }
        .lcmg-card-preview { font-size: 11px; color: rgba(255,255,255,0.25); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; line-height: 1.3; }
        .lcmg-card-body { overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.25s ease, opacity 0.2s ease, margin 0.2s ease; }
        .lcmg-card-body.open { max-height: 400px; opacity: 1; margin-top: 10px; }
        .lcmg-card-message { font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.6; white-space: pre-wrap; padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.05); }
        .lcmg-card-actions { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); }

        /* Context input for ratings */
        .lcmg-context-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-size: 11px; padding: 6px 9px; outline: none; font-family: inherit; line-height: 1.4; transition: border-color 0.15s; margin-top: 6px; }
        .lcmg-context-input::placeholder { color: rgba(255,255,255,0.22); }
        .lcmg-context-input:focus { border-color: #2563EB; }

        .lcmg-cap-warning { font-size: 10.5px; color: #fbbf24; line-height: 1.4; margin-top: 4px; }

        /* Confidence checks */
        .lcmg-confidence-toggle { background: none; border: none; color: rgba(255,255,255,0.35); font-size: 10.5px; font-family: inherit; cursor: pointer; padding: 0; transition: color 0.15s; }
        .lcmg-confidence-toggle:hover { color: rgba(255,255,255,0.65); }
        .lcmg-confidence-list { display: flex; flex-direction: column; gap: 5px; }
        .lcmg-confidence-item { display: flex; align-items: center; gap: 6px; font-size: 11px; line-height: 1.4; }
        .lcmg-confidence-item.pass { color: rgba(255,255,255,0.55); }
        .lcmg-confidence-item.warn { color: #fbbf24; }
        .lcmg-confidence-item.fail { color: #f87171; }

        /* Import confirmation */
        .lcmg-import-confirm { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10; padding: 20px; }
        .lcmg-import-confirm-card { background: #141929; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 20px; max-width: 300px; width: 100%; display: flex; flex-direction: column; gap: 12px; }

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
            <div className="lcmg-dropdown-wrap">
              <button className="lcmg-gear-btn" onClick={() => setShowDropdown(!showDropdown)} title="Menu" aria-expanded={showDropdown} aria-haspopup="menu">
                {"☰"}
              </button>
              {showDropdown && (
                <>
                  <div className="lcmg-dropdown-backdrop" onClick={() => setShowDropdown(false)} />
                  <div className="lcmg-dropdown" role="menu">
                    <button className="lcmg-dropdown-item" role="menuitem" onClick={() => { setShowDropdown(false); setShowTracker(true) }}>
                      <svg className="lcmg-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                      Outreach Tracker{followUpCount > 0 ? ` (${followUpCount})` : ""}
                    </button>
                    <button className="lcmg-dropdown-item" role="menuitem" onClick={() => { setShowDropdown(false); setShowTrainingData(true) }}>
                      <svg className="lcmg-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26Z"/></svg>
                      Training Data
                    </button>
                    <button className="lcmg-dropdown-item" role="menuitem" onClick={() => { setShowDropdown(false); setSetupDraft(senderInfo ?? setupDraft); setShowSettings(true) }}>
                      <svg className="lcmg-dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                      Settings
                    </button>
                  </div>
                </>
              )}
            </div>
            <button className="lcmg-close-btn" onClick={() => setCollapsed(true)}>{"✕"}</button>
          </div>
        </div>

        <SettingsPanel
          open={showSettings}
          onClose={() => setShowSettings(false)}
          senderInfo={senderInfo}
          setupDraft={setupDraft}
          setSetupDraft={setSetupDraft}
          senderLinkedinText={senderLinkedinText}
          setSenderLinkedinText={setSenderLinkedinText}
          resumeText={resumeText}
          setResumeText={setResumeText}
          hasApiKey={hasApiKey}
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          onSave={saveSenderInfo}
          onClear={clearSenderInfo}
          onSaveApiKey={saveApiKey}
          savingKey={savingKey}
          scrapeRawPageText={scrapeRawPageText}
        />

        <TrackerPanel
          open={showTracker}
          onClose={() => setShowTracker(false)}
          onFollowUpCount={setFollowUpCount}
        />

        <TrainingDataPanel
          open={showTrainingData}
          onClose={() => setShowTrainingData(false)}
          styleExamples={styleExamples}
          onUpdateExamples={setStyleExamples}
          styleTrainingEnabled={styleTrainingEnabled}
          onToggleTraining={setStyleTrainingEnabled}
        />

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

          <ProfileSection
            profileName={profile.name}
            rawProfileText={rawProfileText}
            profileSource={profileSource}
            profileWarning={profileWarning}
            hookLoading={hookLoading}
            hookDetails={hookDetails}
            selectedHook={selectedHook}
            onSelectHook={setSelectedHook}
            onRescrape={() => loadProfile(0)}
            hasSkills={profile.skills.length > 0}
          />

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

          {/* Conversation notes — keeps thank-you/follow-up messages grounded in what actually happened */}
          {messageType !== "cold" && (
            <div>
              <div className="lcmg-section-label">
                {messageType === "thank_you" ? "What did you discuss? (required)" : messageType === "follow_up" ? "Context on your first message (optional)" : "What did you talk about before? (optional)"}
              </div>
              <textarea
                className="lcmg-textarea"
                rows={2}
                placeholder={messageType === "thank_you" ? "e.g. We talked about his path from S&T to M&A and his advice on networking" : "e.g. I reached out two weeks ago about their restructuring group"}
                value={conversationContext}
                onChange={(e) => setConversationContext(e.target.value)}
              />
              {messageType === "thank_you" && !conversationContext.trim() && (
                <div style={{ fontSize: 10.5, color: "#FFB84D", marginTop: 4, lineHeight: 1.4 }}>
                  Required so the message references your real conversation instead of made-up details.
                </div>
              )}
            </div>
          )}

          {/* More options toggle */}
          <button className="lcmg-more-toggle" onClick={() => setShowMoreOptions(!showMoreOptions)}>
            {showMoreOptions ? "▾" : "▸"} More options
          </button>

          {showMoreOptions && (
            <>
              <div>
                <div className="lcmg-section-label">Referral Name (optional)</div>
                <input className="lcmg-input" style={{ width: "100%" }} type="text" placeholder="e.g. John Smith suggested I reach out" value={referralName} onChange={(e) => setReferralName(e.target.value)} />
              </div>
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
              disabled={loading || hasApiKey === false || !senderInfo?.name || (messageType === "thank_you" && !conversationContext.trim())}>
              {loading ? <>Generating...</> : !senderInfo?.name ? <>Set up your info first</> : messageType === "thank_you" && !conversationContext.trim() ? <>Add discussion notes first</> : <>{"✦"} Generate Message</>}
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
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4, transition: "opacity 0.3s" }}>{progressText || "Crafting hooks..."}</div>
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
                  Your API key is invalid or expired. Open Settings to update it, or <a className="lcmg-api-link" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: "#93c5fd" }}>get a new key</a>.
                </div>
              )}
              {error.includes("429") && (
                <div style={{ fontSize: 11, color: "rgba(255,128,128,0.7)", lineHeight: 1.5 }}>
                  Rate limited. Wait a moment and try again, or check your <a className="lcmg-api-link" href="https://console.anthropic.com/settings/limits" target="_blank" rel="noreferrer" style={{ color: "#93c5fd" }}>usage limits</a>.
                </div>
              )}
              {error.toLowerCase().includes("insufficient") && (
                <div style={{ fontSize: 11, color: "rgba(255,128,128,0.7)", lineHeight: 1.5 }}>
                  Your API account needs credits. Add billing at <a className="lcmg-api-link" href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer" style={{ color: "#93c5fd" }}>console.anthropic.com/settings/billing</a>.
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

          {/* Send format toggle */}
          {variants.length > 0 && !loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="lcmg-section-label" style={{ marginBottom: 0 }}>Sending as</span>
              <div className="lcmg-chip-row">
                <span className={`lcmg-chip${sendFormat === "note" ? " active" : ""}`} onClick={() => setSendFormat("note")}>Connection note (300 chars)</span>
                <span className={`lcmg-chip${sendFormat === "message" ? " active" : ""}`} onClick={() => setSendFormat("message")}>Message / InMail</span>
              </div>
            </div>
          )}

          {/* Variants output */}
          {variants.length > 0 && !loading && variants.map((variant, index) => (
            <MessageOutput
              key={index}
              variant={variant}
              index={index}
              totalVariants={variants.length}
              charLimit={sendFormat === "note" ? 300 : null}
              styleTrainingEnabled={styleTrainingEnabled}
              rating={ratedVariants[index]}
              ratingContext={variantContexts[index] || ""}
              libraryFull={styleExamples.length >= 10}
              onEdit={handleVariantEdit}
              onRate={rateVariant}
              onContextChange={handleVariantContextChange}
              onContextCommit={handleVariantContextCommit}
              onCopy={trackCopiedMessage}
            />
          ))}

          {variants.length > 0 && !loading && (
            <button className="lcmg-btn-ghost" style={{ justifyContent: "center" }} onClick={generateMessage}>{"↺"} Regenerate</button>
          )}

          {tokenUsage && !loading && (
            <div style={{ display: "flex", justifyContent: "center", gap: 12, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
              <span>{tokenUsage.inputTokens} in</span>
              <span>{tokenUsage.outputTokens} out</span>
              {activeModel && (
                <span>~${((tokenUsage.inputTokens * activeModel.costPer1kInput + tokenUsage.outputTokens * activeModel.costPer1kOutput) / 1000).toFixed(4)}</span>
              )}
            </div>
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

function SidebarWithErrorBoundary() {
  return (
    <SidebarErrorBoundary>
      <Sidebar />
    </SidebarErrorBoundary>
  )
}

export default SidebarWithErrorBoundary
