import { useState } from 'react'
import { clearLLMConfig, getLLMConfig, setLLMConfig } from '../lib/llmConfig'
import { DEFAULT_PROVIDER, PROVIDERS, getProvider } from '../lib/providers'
import { LLMError, describeEndpoint, listModels, pingModel } from '../lib/llm'
import InstallButton from '../components/InstallButton'

function Settings({ onSaved, onCancel }) {
  const existing = getLLMConfig()
  const [provider, setProvider] = useState(existing?.provider ?? DEFAULT_PROVIDER)
  const [baseUrl, setBaseUrl] = useState(
    existing?.baseUrl ?? getProvider(DEFAULT_PROVIDER).defaultBaseUrl
  )
  const [model, setModel] = useState(existing?.model ?? '')
  const [models, setModels] = useState([])
  const [checking, setChecking] = useState(false)
  const [stage, setStage] = useState('')
  const [checkError, setCheckError] = useState('')
  const [checkedOk, setCheckedOk] = useState(false)
  const isEditing = Boolean(existing)

  // The DM may only proceed once the chosen model has actually answered.
  const canSave = checkedOk && Boolean(model.trim())

  function invalidateCheck() {
    setCheckedOk(false)
    setModels([])
    setCheckError('')
  }

  function handleProviderChange(id) {
    if (id === provider) return
    setProvider(id)
    setBaseUrl(getProvider(id).defaultBaseUrl)
    setModel('')
    invalidateCheck()
  }

  async function handleTest() {
    setChecking(true)
    setCheckError('')
    setCheckedOk(false)
    try {
      const found = await listModels(provider, baseUrl)
      setModels(found)
      if (found.length === 0) {
        setCheckError('Connected, but the server reports no loaded models. Load or pull a model, then test again.')
        return
      }

      // Listing models only proves the server is up. Send a real (tiny) prompt
      // so the DM can't proceed on a model that never actually replies.
      const target = found.includes(model) ? model : found[0]
      setModel(target)
      setStage(`Loading ${target}...`)
      await pingModel(provider, baseUrl, target)
      setCheckedOk(true)
    } catch (err) {
      setCheckError(err instanceof LLMError ? err.message : 'Could not connect to the server.')
    } finally {
      setStage('')
      setChecking(false)
    }
  }

  function handleSave(e) {
    e.preventDefault()
    if (!canSave) return
    setLLMConfig({ provider, baseUrl, model })
    onSaved()
  }

  function handleRemove() {
    clearLLMConfig()
    setProvider(DEFAULT_PROVIDER)
    setBaseUrl(getProvider(DEFAULT_PROVIDER).defaultBaseUrl)
    setModel('')
    invalidateCheck()
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#151221] px-6 py-8 text-white [padding-top:max(2rem,env(safe-area-inset-top))] [padding-bottom:max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
        <div>
          <div className="mb-2 flex justify-end">
            <InstallButton />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-purple-300">
            {isEditing ? 'Connection Settings' : 'Welcome to Homebrew Forge'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Homebrew Forge generates content with a local LLM running on your own
            machine — nothing is sent anywhere else, and no API key is needed.
            A local LLM server must be running before you can continue.
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <span className="mb-1.5 block px-1 text-xs font-semibold uppercase tracking-wide text-white/40">
              Server type
            </span>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(PROVIDERS).map((p) => {
                const selected = provider === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id)}
                    className={`rounded-xl border py-3 text-sm font-medium transition-colors ${
                      selected
                        ? 'border-purple-400 bg-purple-500/15 text-purple-200'
                        : 'border-white/10 bg-white/5 text-white/70'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 px-1 text-xs text-white/40">
              {provider === 'ollama'
                ? 'Ollama — run "ollama serve" and pull a model.'
                : 'LM Studio, llama.cpp, or any OpenAI-compatible server.'}
            </p>
          </div>

          <div>
            <label htmlFor="server-url" className="mb-1.5 block px-1 text-xs font-semibold uppercase tracking-wide text-white/40">
              Server URL
            </label>
            <input
              id="server-url"
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value)
                invalidateCheck()
              }}
              placeholder={getProvider(provider).defaultBaseUrl}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white placeholder-white/30 outline-none focus:border-purple-400"
            />
            {baseUrl.trim() && (
              <p className="mt-1.5 break-all px-1 text-xs text-white/40">
                → {describeEndpoint(provider, baseUrl)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleTest}
            disabled={checking || !baseUrl.trim()}
            className="w-full rounded-xl border border-white/15 py-3 text-sm font-medium text-white/80 disabled:opacity-30"
          >
            {checking ? stage || 'Testing...' : 'Test Connection'}
          </button>

          {checkError && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {checkError}
            </p>
          )}

          {checkedOk && (
            <p className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-200">
              Connected — {model} responded.
            </p>
          )}

          {models.length > 0 && (
            <div>
              <label htmlFor="model" className="mb-1.5 block px-1 text-xs font-semibold uppercase tracking-wide text-white/40">
                Model
              </label>
              <select
                id="model"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value)
                  // A different model has to prove it responds on its own.
                  setCheckedOk(false)
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none focus:border-purple-400"
              >
                {models.map((m) => (
                  <option key={m} value={m} className="bg-[#151221]">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSave}
            className="w-full rounded-xl bg-purple-500 py-3.5 text-base font-semibold text-white disabled:opacity-30"
          >
            {isEditing ? 'Save' : 'Save & Continue'}
          </button>

          {!checkedOk && (
            <p className="px-1 text-center text-xs text-white/40">
              {models.length > 0
                ? 'Test the connection to confirm this model responds.'
                : 'Test the connection to pick a model and continue.'}
            </p>
          )}

          {isEditing && (
            <div className="flex gap-3">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/70"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleRemove}
                className="flex-1 rounded-xl border border-red-500/30 py-3 text-sm font-medium text-red-300"
              >
                Remove config
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default Settings
