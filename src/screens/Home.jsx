import { useState } from 'react'
import { CONTENT_TYPES } from '../lib/schemas'
import { buildCoreGenerationPrompt } from '../lib/prompts'
import { LLMError, RawOutputError, callLLM, parseJsonResponse } from '../lib/llm'
import { saveEntry } from '../lib/library'
import { normalizeEntry } from '../lib/normalize'
import InstallButton from '../components/InstallButton'

function Home({ onEditSettings, onOpenLibrary, onGenerated }) {
  const [contentType, setContentType] = useState(null)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState('')
  const [rawOutput, setRawOutput] = useState('')

  const canGenerate = Boolean(contentType) && description.trim().length > 0 && status !== 'loading'

  async function handleGenerate() {
    if (!canGenerate) return

    setStatus('loading')
    setError('')
    setRawOutput('')
    try {
      const { promptLabel, schema } = CONTENT_TYPES[contentType]
      const system = buildCoreGenerationPrompt(promptLabel, schema)
      const text = await callLLM({ system, prompt: description.trim() })
      const generated = normalizeEntry(contentType, parseJsonResponse(text))
      const entry = await saveEntry({ contentType, data: generated })
      setStatus('idle')
      onGenerated(entry)
    } catch (err) {
      setStatus('error')
      if (err instanceof RawOutputError) {
        // Last resort in the safety net: show what the model actually said
        // rather than crashing, and let the DM regenerate.
        setError("The model didn't return usable JSON. Here's what it said:")
        setRawOutput(err.raw)
      } else {
        setError(err instanceof LLMError ? err.message : 'Something went wrong generating that entry.')
      }
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#151221] px-5 py-6 text-white [padding-top:max(1.5rem,env(safe-area-inset-top))] [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="mx-auto flex w-full max-w-md items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-purple-300">
          Homebrew Forge
        </h1>
        <div className="flex items-center gap-2">
          <InstallButton />
          <button
            type="button"
            onClick={onOpenLibrary}
            aria-label="Library"
            className="rounded-full border border-white/10 p-2.5 text-white/60"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onEditSettings}
            aria-label="Connection settings"
            className="rounded-full border border-white/10 p-2.5 text-white/60"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 pt-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
            What are you making?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(CONTENT_TYPES).map(([key, { label, icon }]) => {
              const selected = contentType === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setContentType(key)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border py-6 text-base font-medium transition-colors ${
                    selected
                      ? 'border-purple-400 bg-purple-500/15 text-purple-200'
                      : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                >
                  <span className="text-3xl">{icon}</span>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/50">
            Describe it
          </h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A frost-touched dagger that hungers for the cold, said to have been wielded by a monk who froze to death chasing a legend..."
            rows={6}
            disabled={status === 'loading'}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white placeholder-white/30 outline-none focus:border-purple-400 disabled:opacity-50"
          />
        </div>

        <div className="mt-auto pb-2">
          {error && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-200">{error}</p>
              {rawOutput && (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-2 text-xs text-white/60">
                  {rawOutput}
                </pre>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 py-4 text-base font-semibold text-white disabled:opacity-30"
          >
            {status === 'loading' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Forging...
              </>
            ) : rawOutput ? (
              'Regenerate'
            ) : (
              'Generate'
            )}
          </button>
          {status === 'loading' && (
            <p className="mt-2 text-center text-xs text-white/40">
              Local generation can take a minute.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
