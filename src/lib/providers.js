/**
 * Adapters for the two supported local-LLM server styles. Each exposes the
 * same shape — listModels() and chat() — so everything above this layer is
 * provider-agnostic.
 */

export class LLMError extends Error {}

function trimSlashes(url) {
  return url.trim().replace(/\/+$/, '')
}

/** Tolerates a full endpoint URL being pasted in, not just the server root. */
function stripEndpointSuffix(url, suffixes) {
  let out = trimSlashes(url)
  for (const suffix of suffixes) {
    if (out.toLowerCase().endsWith(suffix)) {
      out = trimSlashes(out.slice(0, -suffix.length))
      break
    }
  }
  return out
}

async function readError(response) {
  const detail = await response.text().catch(() => '')
  return detail.slice(0, 200)
}

// ---------------------------------------------------------------- Ollama ---

const ollama = {
  id: 'ollama',
  label: 'Ollama',
  defaultBaseUrl: 'http://localhost:11434',
  normalizeBaseUrl: (url) => stripEndpointSuffix(url, ['/api/chat', '/api/generate', '/api/tags']),
  modelsUrl: (baseUrl) => `${baseUrl}/api/tags`,
  chatUrl: (baseUrl) => `${baseUrl}/api/chat`,

  async listModels(baseUrl) {
    const response = await fetch(this.modelsUrl(baseUrl))
    if (!response.ok) throw new LLMError(`Server returned an error (${response.status}).`)
    const data = await response.json()
    return (data.models ?? []).map((m) => m.name)
  },

  async chat({ baseUrl, model, system, prompt, json, maxTokens, signal }) {
    const body = {
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      stream: false,
      options: { num_predict: maxTokens },
    }
    if (json) body.format = 'json'

    const response = await fetch(this.chatUrl(baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    if (!response.ok) {
      throw new LLMError(`Ollama error (${response.status}): ${await readError(response)}`)
    }
    const data = await response.json()
    return data.message?.content ?? ''
  },
}

// ------------------------------------------------------- OpenAI-compatible ---

const openaiCompatible = {
  id: 'openai',
  label: 'OpenAI-compatible',
  defaultBaseUrl: 'http://localhost:1234/v1',
  normalizeBaseUrl: (url) => stripEndpointSuffix(url, ['/chat/completions', '/completions']),
  modelsUrl: (baseUrl) => `${baseUrl}/models`,
  chatUrl: (baseUrl) => `${baseUrl}/chat/completions`,

  async listModels(baseUrl) {
    const response = await fetch(this.modelsUrl(baseUrl))
    if (!response.ok) throw new LLMError(`Server returned an error (${response.status}).`)
    const data = await response.json()
    return (data.data ?? []).map((m) => m.id).filter(Boolean)
  },

  async chat({ baseUrl, model, system, prompt, json, maxTokens, signal }) {
    const build = (withResponseFormat) => {
      const body = {
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
        stream: false,
        max_tokens: maxTokens,
      }
      if (json && withResponseFormat) body.response_format = { type: 'json_object' }
      return body
    }

    const send = (body) =>
      fetch(this.chatUrl(baseUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })

    let response = await send(build(true))

    // Not every local server implements response_format; a 400 there is
    // recoverable, since the parsing safety net can still handle loose output.
    if (!response.ok && response.status === 400 && json) {
      response = await send(build(false))
    }

    if (!response.ok) {
      throw new LLMError(`Server error (${response.status}): ${await readError(response)}`)
    }
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
  },
}

export const PROVIDERS = {
  ollama,
  openai: openaiCompatible,
}

export const DEFAULT_PROVIDER = 'ollama'

export function getProvider(id) {
  return PROVIDERS[id] ?? PROVIDERS[DEFAULT_PROVIDER]
}
