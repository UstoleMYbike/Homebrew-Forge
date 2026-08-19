import { useEffect, useRef, useState } from 'react'
import { CONTENT_TYPES } from '../lib/schemas'
import { buildBalanceCheckPrompt } from '../lib/prompts'
import { LLMError, RawOutputError, callLLM, parseJsonResponse } from '../lib/llm'

/** Local models are loose with shapes, so coerce whatever comes back. */
function normalizeFlags(parsed) {
  const raw = Array.isArray(parsed?.flags) ? parsed.flags : []
  return raw
    .map((flag) => ({
      field: String(flag?.field ?? '').trim(),
      issue: String(flag?.issue ?? '').trim(),
      suggestedFix: String(flag?.suggestedFix ?? '').trim(),
    }))
    .filter((flag) => flag.issue || flag.suggestedFix)
}

function BalanceBadge({ contentType, data, autoCheck }) {
  const [status, setStatus] = useState('idle') // idle | running | done | error
  const [flags, setFlags] = useState([])
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [checkedSignature, setCheckedSignature] = useState(null)

  // Guards against React StrictMode double-invoking the mount effect, which
  // would fire two generations' worth of local inference.
  const autoStarted = useRef(false)

  const signature = JSON.stringify(data)
  const stale = status === 'done' && checkedSignature !== null && checkedSignature !== signature

  async function runCheck() {
    setStatus('running')
    setError('')
    setDismissed(false)
    const checking = JSON.stringify(data)
    try {
      const system = buildBalanceCheckPrompt(CONTENT_TYPES[contentType].promptLabel)
      const raw = await callLLM({ system, prompt: checking })
      setFlags(normalizeFlags(parseJsonResponse(raw)))
      setCheckedSignature(checking)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      if (err instanceof RawOutputError) {
        setError('The balance check returned unreadable output.')
      } else {
        setError(err instanceof LLMError ? err.message : 'Balance check failed.')
      }
    }
  }

  useEffect(() => {
    if (autoCheck && !autoStarted.current) {
      autoStarted.current = true
      runCheck()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheck])

  function recheckButton(label) {
    return (
      <button
        type="button"
        onClick={runCheck}
        className="text-xs font-medium text-white/50 underline underline-offset-2"
      >
        {label}
      </button>
    )
  }

  if (status === 'running') {
    return (
      <div className="no-print mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white/70" />
        <span className="text-xs text-white/50">Checking balance in the background...</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="no-print mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <span className="text-xs text-white/50">{error}</span>
        {recheckButton('Try again')}
      </div>
    )
  }

  if (status === 'idle' || dismissed) {
    return <div className="no-print mt-3 text-center">{recheckButton('Check balance')}</div>
  }

  if (stale) {
    return (
      <div className="no-print mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <span className="text-xs text-white/50">Content changed since the last balance check.</span>
        {recheckButton('Re-check')}
      </div>
    )
  }

  if (flags.length === 0) {
    return (
      <div className="no-print mt-3 flex items-center justify-between gap-3 rounded-xl border border-green-500/25 bg-green-500/10 px-3 py-2.5">
        <span className="text-xs text-green-200">✓ No balance issues found.</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss balance check"
          className="text-xs font-medium text-green-200/70"
        >
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div className="no-print mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
          ⚠ {flags.length} balance {flags.length === 1 ? 'flag' : 'flags'}
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss balance check"
          className="shrink-0 text-xs font-medium text-amber-200/70"
        >
          Dismiss
        </button>
      </div>

      <ul className="mt-2 flex flex-col gap-2.5">
        {flags.map((flag, i) => (
          <li key={i} className="border-t border-amber-500/20 pt-2 first:border-0 first:pt-0">
            {flag.field && (
              <p className="text-xs font-semibold text-amber-100">{flag.field}</p>
            )}
            {flag.issue && <p className="mt-0.5 text-xs text-amber-100/80">{flag.issue}</p>}
            {flag.suggestedFix && (
              <p className="mt-1 text-xs text-amber-200/70">
                <span className="font-semibold">Suggested fix:</span> {flag.suggestedFix}
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[11px] text-amber-200/50">
        Advisory only — nothing has been changed.
      </p>
    </div>
  )
}

export default BalanceBadge
