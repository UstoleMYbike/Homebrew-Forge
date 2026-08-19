import { DEFAULT_PROVIDER, PROVIDERS } from './providers'

// Per spec, connection settings live in localStorage; IndexedDB is reserved
// for the generated-content library.
const STORAGE_KEY = 'homebrew-forge:llm-config'

export function getLLMConfig() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.baseUrl || !parsed?.model) return null
    return {
      provider: PROVIDERS[parsed.provider] ? parsed.provider : DEFAULT_PROVIDER,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
    }
  } catch {
    return null
  }
}

export function setLLMConfig({ provider, baseUrl, model }) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ provider, baseUrl: baseUrl.trim(), model: model.trim() })
  )
}

export function clearLLMConfig() {
  localStorage.removeItem(STORAGE_KEY)
}
