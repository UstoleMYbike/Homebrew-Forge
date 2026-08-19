import { useState } from 'react'
import { CONTENT_TYPES, TIER_OPTIONS } from '../lib/schemas'
import { buildIterationPrompt } from '../lib/prompts'
import { LLMError, RawOutputError, callLLM, parseJsonResponse } from '../lib/llm'
import { normalizeEntry } from '../lib/normalize'

function IterationBar({ contentType, data, onChange }) {
  const [busy, setBusy] = useState(null) // which adjustment is running
  const [previous, setPrevious] = useState(null) // exactly one prior version
  const [error, setError] = useState('')
  const [rawOutput, setRawOutput] = useState('')
  const [pickingTier, setPickingTier] = useState(false)

  const tier = TIER_OPTIONS[contentType]

  async function run(adjustment, key) {
    setBusy(key)
    setError('')
    setRawOutput('')
    setPickingTier(false)
    try {
      const system = buildIterationPrompt(CONTENT_TYPES[contentType].promptLabel, adjustment)
      const raw = await callLLM({ system, prompt: JSON.stringify(data) })
      const updated = parseJsonResponse(raw)

      if (!updated || typeof updated !== 'object' || Array.isArray(updated)) {
        setError('The model returned something that was not an object. Try again.')
        return
      }

      setPrevious(data)
      // Overlay onto the original rather than replacing outright: the prompt
      // asks for the full object, but a local model dropping a field shouldn't
      // silently wipe it from the card. Normalize after merging, so a changed
      // base type clears whatever the previous shape left behind.
      onChange(normalizeEntry(contentType, { ...data, ...updated }))
    } catch (err) {
      if (err instanceof RawOutputError) {
        setError("The model didn't return usable JSON, so nothing changed:")
        setRawOutput(err.raw)
      } else {
        setError(err instanceof LLMError ? err.message : 'That adjustment failed.')
      }
    } finally {
      setBusy(null)
    }
  }

  function handleUndo() {
    if (!previous) return
    onChange(previous)
    setPrevious(null) // only one level of history is kept
    setError('')
    setRawOutput('')
  }

  const actions = [
    { key: 'weaker', label: 'Weaker', adjustment: 'weaker' },
    { key: 'stronger', label: 'Stronger', adjustment: 'stronger' },
    { key: 'reroll', label: 'Reroll flavor', adjustment: 'reroll flavor' },
  ]

  return (
    <div className="no-print mt-4">
      <div className="grid grid-cols-2 gap-2">
        {actions.map(({ key, label, adjustment }) => (
          <button
            key={key}
            type="button"
            onClick={() => run(adjustment, key)}
            disabled={Boolean(busy)}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm font-medium text-white/80 disabled:opacity-40"
          >
            {busy === key && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {label}
          </button>
        ))}

        {tier && (
          <button
            type="button"
            onClick={() => setPickingTier((open) => !open)}
            disabled={Boolean(busy)}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm font-medium text-white/80 disabled:opacity-40"
          >
            {busy === 'tier' && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            Change {tier.inlineLabel}
          </button>
        )}
      </div>

      {pickingTier && tier && (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-white/40">
            Change {tier.inlineLabel} to
          </p>
          <div className="flex flex-wrap gap-2">
            {tier.options
              .filter((option) => String(option) !== String(data[tier.field]))
              .map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => run(`change tier to ${option}`, 'tier')}
                  className="rounded-full border border-white/15 px-3.5 py-2 text-xs font-medium text-white/75"
                >
                  {option}
                </button>
              ))}
          </div>
        </div>
      )}

      {previous && !busy && (
        <button
          type="button"
          onClick={handleUndo}
          className="mt-2 w-full rounded-xl border border-white/10 py-2.5 text-xs font-medium text-white/60"
        >
          ↶ Undo last change
        </button>
      )}

      {error && (
        <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
          {rawOutput && (
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-2 text-xs text-white/60">
              {rawOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default IterationBar
