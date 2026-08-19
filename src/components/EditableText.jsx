import { useEffect, useState } from 'react'

function EditableText({
  value,
  onChange,
  className = '',
  placeholder = 'Tap to add',
  multiline = false,
  numeric = false,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  useEffect(() => {
    setDraft(value ?? '')
  }, [value])

  function commit() {
    if (numeric) {
      const trimmed = String(draft).trim()
      const parsed = Number(trimmed)
      onChange(trimmed === '' || !Number.isFinite(parsed) ? null : parsed)
    } else {
      onChange(draft)
    }
    setEditing(false)
  }

  if (editing) {
    const shared = {
      autoFocus: true,
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e) => {
        if (e.key === 'Enter' && !multiline) commit()
        if (e.key === 'Escape') {
          setDraft(value ?? '')
          setEditing(false)
        }
      },
      className: `${className} w-full rounded-lg border border-purple-400 bg-white/5 px-2 py-1 outline-none`,
    }
    if (numeric) shared.inputMode = 'numeric'
    return multiline ? <textarea {...shared} rows={4} /> : <input {...shared} />
  }

  const isEmpty = value === null || value === undefined || value === ''

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`${className} block w-full rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/5`}
    >
      {isEmpty ? <span className="text-white/30">{placeholder}</span> : value}
    </button>
  )
}

export default EditableText
