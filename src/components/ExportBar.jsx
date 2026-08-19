import { useEffect, useRef, useState } from 'react'
import { copyToClipboard, toDndBeyondText, toHomebreweryMarkdown } from '../lib/exporters'

function ExportBar({ contentType, data }) {
  const [sheet, setSheet] = useState(null) // { title, text, copied }
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const toastTimer = useRef(null)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  function flashToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2000)
  }

  async function handleMarkdown() {
    setError('')
    const markdown = toHomebreweryMarkdown(contentType, data)
    // Synchronous work, so the user gesture is still intact for the clipboard.
    if (await copyToClipboard(markdown)) flashToast('Markdown copied')
    else setSheet({ title: 'Markdown', text: markdown, copied: false })
  }

  async function handleDndBeyond() {
    setError('')
    const formatted = toDndBeyondText(contentType, data)
    // Built locally from the real form layout, so there's no model round-trip
    // and the clipboard write stays inside the user gesture.
    const copied = await copyToClipboard(formatted)
    setSheet({ title: 'D&D Beyond', text: formatted, copied })
  }

  function handlePdf() {
    window.print()
  }

  return (
    <>
      <div className="no-print mt-4">
        {error && (
          <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDndBeyond}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 py-3.5 text-sm font-semibold text-white"
          >
            Copy for D&D Beyond
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMarkdown}
              className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-medium text-white/80"
            >
              Copy as Markdown
            </button>
            <button
              type="button"
              onClick={handlePdf}
              className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-medium text-white/80"
            >
              Export as PDF
            </button>
          </div>
        </div>

        {toast && (
          <p className="mt-2 text-center text-xs text-green-300">{toast}</p>
        )}
      </div>

      {sheet && (
        <div className="no-print fixed inset-0 z-50 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center">
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#1b1730] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{sheet.title}</h2>
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="Close"
                className="rounded-full border border-white/10 p-2 text-white/60"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mt-1 text-xs text-white/40">
              {sheet.copied
                ? 'Copied to your clipboard — paste it field by field.'
                : 'Copy this text and paste it into the Homebrew Creator.'}
            </p>

            <textarea
              readOnly
              value={sheet.text}
              onFocus={(e) => e.target.select()}
              rows={12}
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-white/80 outline-none"
            />

            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(sheet.text)
                setSheet((s) => ({ ...s, copied: ok }))
                if (ok) flashToast('Copied')
              }}
              className="mt-3 w-full rounded-xl bg-purple-500 py-3 text-sm font-semibold text-white"
            >
              Copy to clipboard
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default ExportBar
