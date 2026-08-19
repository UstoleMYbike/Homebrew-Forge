import { getLLMConfig } from './llmConfig'
import { LLMError, getProvider } from './providers'

export { LLMError }

/**
 * Thrown when the safety net has exhausted every parsing strategy. Carries the
 * raw model output so the DM can be shown what actually came back (with a
 * Regenerate button) instead of the app crashing on a bad local-model reply.
 */
export class RawOutputError extends LLMError {
  constructor(raw) {
    super('The model did not return valid JSON.')
    this.raw = raw
  }
}

function stripFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

/**
 * Scans for the first brace-balanced {...} block, tracking string state and
 * escapes so braces inside string values don't throw off the depth count.
 * Preferred over a plain regex, which cannot match nested braces correctly.
 */
function extractFirstJsonObject(text) {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      if (inString) escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

/** strip fences -> parse -> extract first balanced {...} -> parse -> give up with raw output */
export function parseJsonResponse(text) {
  const cleaned = stripFences(text)

  try {
    return JSON.parse(cleaned)
  } catch {
    // fall through to extraction
  }

  const extracted = extractFirstJsonObject(cleaned)
  if (extracted) {
    try {
      return JSON.parse(extracted)
    } catch {
      // fall through to raw output
    }
  }

  throw new RawOutputError(text)
}

/** For prompts that intentionally return prose, not JSON (naming, export formatting). */
export function parseTextResponse(text) {
  return stripFences(text)
}

export function normalizeBaseUrl(providerId, baseUrl) {
  return getProvider(providerId).normalizeBaseUrl(baseUrl)
}

export function describeEndpoint(providerId, baseUrl) {
  const provider = getProvider(providerId)
  return provider.chatUrl(provider.normalizeBaseUrl(baseUrl))
}

export async function listModels(providerId, baseUrl) {
  const provider = getProvider(providerId)
  const url = provider.normalizeBaseUrl(baseUrl)
  try {
    return await provider.listModels(url)
  } catch (err) {
    if (err instanceof LLMError) throw err
    throw new LLMError(
      `Could not reach a local LLM server at ${url}. Make sure it's running and that this app's origin is allowed (for Ollama, set OLLAMA_ORIGINS).`
    )
  }
}

/**
 * Confirms the chosen model actually loads and replies — listing models only
 * proves the server is up, not that the model responds.
 */
export async function pingModel(providerId, baseUrl, model) {
  const provider = getProvider(providerId)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120000)
  try {
    const text = await provider.chat({
      baseUrl: provider.normalizeBaseUrl(baseUrl),
      model,
      prompt: 'Reply with the single word: OK',
      maxTokens: 5,
      json: false,
      signal: controller.signal,
    })
    if (!text.trim()) {
      throw new LLMError(`${model} connected but returned an empty reply.`)
    }
    return text.trim()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new LLMError(`${model} did not respond within 2 minutes. It may be too large for this machine.`)
    }
    if (err instanceof LLMError) throw err
    throw new LLMError(`Could not reach the server at ${baseUrl}.`)
  } finally {
    clearTimeout(timer)
  }
}

export async function callLLM({ system, prompt, maxTokens = 2000, json = true }) {
  const config = getLLMConfig()
  if (!config) {
    throw new LLMError('No local LLM server is configured. Set one up in Settings.')
  }
  const provider = getProvider(config.provider)

  let text
  try {
    text = await provider.chat({
      baseUrl: provider.normalizeBaseUrl(config.baseUrl),
      model: config.model,
      system,
      prompt,
      json,
      maxTokens,
    })
  } catch (err) {
    if (err instanceof LLMError) throw err
    throw new LLMError(`Could not reach the local LLM server at ${config.baseUrl}. Is it running?`)
  }

  if (!text) throw new LLMError('The model returned an empty response.')
  return text
}
