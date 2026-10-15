import { LLMError } from './providers'

/**
 * Claude as the model, for the published artifact. A page asks Claude through
 * the `sample` capability, which runs on the viewer's own Claude account, and
 * saves files through `downloads`. Both resolve null when the page is not open
 * inside Claude, so callers have to cope with absence.
 */

const TIER_KEY = 'homebrew-forge:claude-tier'

export const TIERS = [
  { id: 'quick', label: 'Fast', note: 'Quickest and lightest on your usage. Fine for items, feats and short spells.' },
  { id: 'default', label: 'Balanced', note: 'The everyday choice. Good with every content type.' },
  { id: 'complex', label: 'Thorough', note: 'Slowest and heaviest on usage. Best for intricate monsters.' },
]

export function getTier() {
  try {
    const stored = localStorage.getItem(TIER_KEY)
    return TIERS.some((t) => t.id === stored) ? stored : 'default'
  } catch {
    return 'default'
  }
}

export function setTier(id) {
  try {
    localStorage.setItem(TIER_KEY, id)
  } catch {
    // Storage can be blocked in a framed view; the choice then lasts one session.
  }
}

function capability(name) {
  const claude = typeof window === 'undefined' ? null : window.claude
  if (!claude?.use) return Promise.resolve(null)
  return Promise.resolve(claude.use(name)).catch(() => null)
}

export const getSample = () => capability('sample')
export const getDownloads = () => capability('downloads')

const SAMPLE_ERRORS = {
  not_granted: 'Claude access was declined for this page. Reload it and choose Allow to generate.',
  sampling_disabled: 'Claude is not available for this account.',
  not_declared: 'Claude is not available for this page.',
  capability_disabled: 'Claude is not available in this view.',
  capability_removed: 'Claude is not available in this view.',
  rate_limited: 'You have reached your Claude usage limit for now. Try again in a little while.',
  session_expired: 'Your Claude session expired. Sign in again, then retry.',
  refused: 'Claude declined that request. Try describing it differently.',
  empty_completion: 'Claude returned nothing. Try again, or simplify the description.',
  prompt_too_large: 'That is too much text to send at once. Shorten the description.',
  upstream_error: 'Claude had a connection problem. Try again.',
}

/** Turns a `sample` rejection into the app's own error type. */
export function toLLMError(e) {
  if (e instanceof LLMError) return e
  const message = SAMPLE_ERRORS[e?.code] ?? SAMPLE_ERRORS.upstream_error
  const err = new LLMError(message)
  err.code = e?.code
  return err
}

/**
 * One memory-less call to Claude. `sample` has no system prompt, so the
 * instructions and the input travel together as one string. Repeat calls are
 * cached by the platform for five minutes, so anything that must come back
 * different ("Reroll", "Regenerate") keeps `cache` false.
 */
export async function askClaude({ system, prompt, cache = false }) {
  const sample = await getSample()
  if (!sample) {
    throw new LLMError('Claude is not available here. Open this page inside Claude to generate.')
  }
  const input = system ? `${system}\n\n--- INPUT ---\n${prompt}` : prompt
  try {
    const { text } = await sample(input, { modelTier: getTier(), cache })
    return text
  } catch (e) {
    throw toLLMError(e)
  }
}

/**
 * Offers a file to the viewer. Resolves null when they decline, which is not
 * an error worth showing.
 */
export async function saveFile(filename, data) {
  const downloads = await getDownloads()
  if (!downloads) {
    throw new LLMError('Saving files is not available in this view. Use the copy buttons instead.')
  }
  try {
    return await downloads.save({ filename, data })
  } catch (e) {
    if (e?.code === 'declined') return null
    throw new LLMError('That file could not be saved. Use the copy buttons instead.')
  }
}
