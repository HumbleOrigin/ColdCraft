export type AIConfig = {
  provider: "anthropic" | "openai"
  apiKey: string
  model: string
  baseUrl?: string
}

export type AIResponse = {
  text: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export async function callAI(
  config: AIConfig,
  system: string,
  prompt: string,
  maxTokens: number
): Promise<AIResponse> {
  if (config.provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const apiMsg = errorData?.error?.message || ""
      const status = response.status
      if (status === 401) {
        throw Error(`Invalid API key (${status}). Check that your key is correct and hasn't been revoked.`)
      } else if (status === 429) {
        throw Error(`Rate limited (${status}). ${apiMsg || "Too many requests. Wait a moment and try again."}`)
      } else if (status === 400 && apiMsg.includes("credit")) {
        throw Error(`Insufficient credits. ${apiMsg}`)
      } else {
        throw Error(apiMsg || `API error (${status}). Try again or check console.anthropic.com for service status.`)
      }
    }

    const data = await response.json()
    return {
      text: data.content?.[0]?.text || "",
      usage: data.usage
        ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
        : undefined
    }
  }

  // OpenAI-compatible providers (OpenAI, OpenRouter, Groq, Mistral)
  const baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const apiMsg = errorData?.error?.message || ""
    const status = response.status
    if (status === 401) {
      throw Error(`Invalid API key (${status}). Check that your key is correct.`)
    } else if (status === 429) {
      throw Error(`Rate limited (${status}). Wait a moment and try again.`)
    } else {
      throw Error(apiMsg || `API error (${status})`)
    }
  }

  const data = await response.json()
  return {
    text: data.choices?.[0]?.message?.content || "",
    usage: data.usage
      ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
      : undefined
  }
}

export async function loadAIConfig(): Promise<AIConfig | null> {
  const result = await chrome.storage.sync.get(["ai_provider", "ai_api_key", "ai_model", "ai_base_url"])
  if (!result.ai_api_key) return null
  return {
    provider: result.ai_provider || "anthropic",
    apiKey: result.ai_api_key,
    model: result.ai_model || (result.ai_provider === "openai" ? "gpt-4o" : "claude-sonnet-4-6"),
    baseUrl: result.ai_base_url || undefined
  }
}
