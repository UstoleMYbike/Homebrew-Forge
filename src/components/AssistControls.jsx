import { useState } from 'react'
import { CONTENT_TYPES, DDB_CHALLENGE_RATINGS, DDB_RARITIES, TIER_OPTIONS } from '../lib/schemas'
import { buildNamingPrompt, buildTierSuggestionPrompt } from '../lib/prompts'
import { LLMError, callLLM, parseJsonResponse, parseTextResponse } from '../lib/llm'

function Spinner() {
  return <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white/70" />
}

/** Regenerates just the name, leaving every other field alone. */
export function RerollNameButton({ contentType, data, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function reroll() {
    setBusy(true)
    setError('')
    try {
      // Tone comes from the prose, so send that rather than the whole object.
      const tone = [data.description, data.properties].filter(Boolean).join('\n\n').trim()
      const raw = await callLLM({
        system: buildNamingPrompt(),
        prompt: tone || `A homebrew D&D 5e ${contentType}.`,
        json: false, // this prompt returns a bare string
        maxTokens: 40,
      })
      const name = parseTextResponse(raw).split('\n')[0].replace(/^["']|["']$/g, '').trim()
      if (!name) {
        setError('The model returned an empty name.')
        return
      }
      onChange({ ...data, name })
    } catch (err) {
      setError(err instanceof LLMError ? err.message : 'Could not generate a name.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={reroll}
        disabled={busy}
        aria-label="Suggest a new name"
        title="Suggest a new name"
        className="no-print shrink-0 rounded-full border border-white/10 p-2 text-white/40 disabled:opacity-40"
      >
        {busy ? <Spinner /> : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
        )}
      </button>
      {error && <span className="no-print text-xs text-red-300">{error}</span>}
    </>
  )
}

/** Turns a model's tier string into a value the schema actually accepts. */
function applyTier(contentType, suggestion, data) {
  const raw = String(suggestion ?? '').trim()
  if (!raw) return null

  if (contentType === 'item') {
    const match = DDB_RARITIES.find((r) => r.toLowerCase() === raw.toLowerCase())
    return match ? { ...data, rarity: match } : null
  }

  if (contentType === 'monster') {
    const match = DDB_CHALLENGE_RATINGS.find((cr) => cr === raw.replace(/^cr\s*/i, ''))
    return match ? { ...data, challengeRating: match } : null
  }

  if (contentType === 'spell') {
    if (/cantrip/i.test(raw)) return { ...data, level: 0 }
    const digits = raw.match(/\d/)
    const level = digits ? Number(digits[0]) : NaN
    return Number.isFinite(level) && level >= 0 && level <= 9 ? { ...data, level } : null
  }

  return null
}

/** Suggests a rarity / spell level / CR from the entry's mechanics. */
export function SuggestTierButton({ contentType, data, onChange }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { suggestion, reason, applicable }
  const [error, setError] = useState('')

  const tier = TIER_OPTIONS[contentType]
  if (!tier) return null // feats have no tier

  async function suggest() {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      // The spec's system prompt covers all three tier axes without saying
      // which applies, so a magic item comes back with a spell level. Naming
      // the axis in the user turn keeps that prompt verbatim.
      const raw = await callLLM({
        system: buildTierSuggestionPrompt(),
        prompt: `This is a homebrew D&D 5e ${CONTENT_TYPES[contentType].promptLabel}. Suggest its ${tier.label}, chosen from: ${tier.options.join(', ')}.\n\n${JSON.stringify(data)}`,
        maxTokens: 200,
      })
      const parsed = parseJsonResponse(raw)
      const suggestion = String(parsed?.suggestion ?? '').trim()
      if (!suggestion) {
        setError('No suggestion came back.')
        return
      }
      setResult({
        suggestion,
        reason: String(parsed?.reason ?? '').trim(),
        applicable: Boolean(applyTier(contentType, suggestion, data)),
      })
    } catch (err) {
      setError(err instanceof LLMError ? err.message : 'Could not suggest a tier.')
    } finally {
      setBusy(false)
    }
  }

  function accept() {
    const updated = applyTier(contentType, result.suggestion, data)
    if (updated) onChange(updated)
    setResult(null)
  }

  return (
    <div className="no-print mt-2">
      {!result && (
        <button
          type="button"
          onClick={suggest}
          disabled={busy}
          className="flex items-center gap-1.5 px-2 text-xs font-medium text-white/40 underline underline-offset-2 disabled:opacity-40"
        >
          {busy && <Spinner />}
          {busy ? 'Thinking...' : `Suggest ${tier.inlineLabel}`}
        </button>
      )}

      {error && <p className="px-2 text-xs text-red-300">{error}</p>}

      {result && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-white/70">
            Suggests <span className="font-semibold text-purple-200">{result.suggestion}</span>
          </p>
          {result.reason && <p className="mt-1 text-xs text-white/50">{result.reason}</p>}
          <div className="mt-2 flex gap-2">
            {result.applicable ? (
              <button
                type="button"
                onClick={accept}
                className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Apply
              </button>
            ) : (
              <span className="text-xs text-amber-200/80">
                Not a {tier.inlineLabel} this app can set — adjust it by hand.
              </span>
            )}
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
