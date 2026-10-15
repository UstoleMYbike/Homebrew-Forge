import { useState } from 'react'
import { TIERS, getTier, setTier } from '../lib/claudeSample'

/** Replaces the local-server Settings screen in the published artifact. */
function ArtifactSettings({ onBack }) {
  const [tier, setTierState] = useState(getTier())

  function choose(id) {
    setTier(id)
    setTierState(id)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#151221] px-6 py-8 text-white [padding-top:max(2rem,env(safe-area-inset-top))] [padding-bottom:max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-purple-300">Claude settings</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Homebrew Forge is running on Claude. Every generation, balance check and rewrite
            uses your own Claude usage, and nothing is sent anywhere else. There is no server
            or API key to set up.
          </p>
        </div>

        <div>
          <span className="mb-1.5 block px-1 text-xs font-semibold uppercase tracking-wide text-white/40">
            Speed
          </span>
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => {
              const selected = tier === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => choose(t.id)}
                  aria-pressed={selected}
                  className={`rounded-xl border py-3 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-purple-400 bg-purple-500/15 text-purple-200'
                      : 'border-white/10 bg-white/5 text-white/70'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2 px-1 text-xs text-white/40">{TIERS.find((t) => t.id === tier)?.note}</p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-xl bg-purple-500 py-3.5 text-base font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  )
}

export default ArtifactSettings
