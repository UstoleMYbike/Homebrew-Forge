import { useEffect, useMemo, useState } from 'react'
import { CONTENT_TYPES } from '../lib/schemas'
import { deleteEntry, duplicateEntry, listEntries } from '../lib/library'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Library({ onBack, onOpen }) {
  const [entries, setEntries] = useState(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [confirmingId, setConfirmingId] = useState(null)

  async function refresh() {
    setEntries(await listEntries())
  }

  useEffect(() => {
    refresh()
  }, [])

  const visible = useMemo(() => {
    if (!entries) return []
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (typeFilter !== 'all' && e.contentType !== typeFilter) return false
      if (q && !e.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [entries, query, typeFilter])

  async function handleDuplicate(id) {
    await duplicateEntry(id)
    refresh()
  }

  async function handleDelete(id) {
    await deleteEntry(id)
    setConfirmingId(null)
    refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#151221] px-5 py-6 text-white [padding-top:max(1.5rem,env(safe-area-inset-top))] [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="mx-auto flex w-full max-w-md items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="rounded-full border border-white/10 p-2.5 text-white/60"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-white/80">Library</h1>
        {entries && (
          <span className="ml-auto text-sm text-white/40">
            {entries.length} saved
          </span>
        )}
      </header>

      <div className="mx-auto mt-5 flex w-full max-w-md flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-white/30 outline-none focus:border-purple-400"
        />

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[['all', 'All'], ...Object.entries(CONTENT_TYPES).map(([k, v]) => [k, v.label])].map(
            ([key, label]) => {
              const selected = typeFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTypeFilter(key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-purple-400 bg-purple-500/15 text-purple-200'
                      : 'border-white/10 bg-white/5 text-white/60'
                  }`}
                >
                  {label}
                </button>
              )
            }
          )}
        </div>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md flex-1">
        {entries === null && <p className="py-10 text-center text-sm text-white/40">Loading...</p>}

        {entries !== null && entries.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-3xl">📖</p>
            <p className="mt-3 text-sm text-white/50">Nothing saved yet.</p>
            <p className="mt-1 text-xs text-white/30">
              Everything you generate is saved here automatically.
            </p>
          </div>
        )}

        {entries !== null && entries.length > 0 && visible.length === 0 && (
          <p className="py-14 text-center text-sm text-white/40">No matches.</p>
        )}

        <ul className="flex flex-col gap-2">
          {visible.map((entry) => {
            const type = CONTENT_TYPES[entry.contentType]
            const confirming = confirmingId === entry.id
            return (
              <li
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{type?.icon ?? '📄'}</span>
                  <button
                    type="button"
                    onClick={() => onOpen(entry)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-base font-medium text-white">{entry.name}</p>
                    <p className="text-xs text-white/40">
                      {type?.label ?? entry.contentType} · {formatDate(entry.updatedAt)}
                    </p>
                  </button>
                </div>

                {confirming ? (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="flex-1 text-xs text-red-200">Delete permanently?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="rounded-lg bg-red-500/80 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/70"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(entry)}
                      className="flex-1 rounded-lg border border-white/15 py-2 text-xs font-medium text-white/70"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(entry.id)}
                      className="flex-1 rounded-lg border border-white/15 py-2 text-xs font-medium text-white/70"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(entry.id)}
                      className="flex-1 rounded-lg border border-red-500/30 py-2 text-xs font-medium text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default Library
