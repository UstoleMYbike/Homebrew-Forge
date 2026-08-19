import EditableText from '../EditableText'
import { normalizeAssumptions } from '../../lib/schemas'

export function Section({ title, children }) {
  return (
    <div className="mt-4">
      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-white/40">{title}</p>
      {children}
    </div>
  )
}

export function Divider() {
  return <div className="my-4 h-px bg-white/10" />
}

/** A label + editable value on one line, the stat-block staple. */
export function StatLine({ label, value, onChange, placeholder, numeric }) {
  return (
    <div className="flex items-baseline gap-2 px-2 text-sm">
      <span className="shrink-0 font-semibold text-white/70">{label}</span>
      <EditableText
        value={value}
        onChange={onChange}
        numeric={numeric}
        placeholder={placeholder ?? '—'}
        className="!px-0 text-sm text-white/80"
      />
    </div>
  )
}

/** Named entries (traits, actions, benefits) with editable name and body. */
export function NamedEntries({ entries, onChange, title, addLabel = 'entry' }) {
  const list = Array.isArray(entries) ? entries : []
  if (list.length === 0) return null

  function update(index, patch) {
    onChange(list.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
  }

  return (
    <Section title={title}>
      <ul className="mt-1 flex flex-col gap-2.5">
        {list.map((entry, i) => (
          <li key={i}>
            <EditableText
              value={entry?.name}
              onChange={(v) => update(i, { name: v })}
              placeholder={`${addLabel} name`}
              className="text-sm font-semibold italic text-white"
            />
            <EditableText
              value={entry?.description}
              onChange={(v) => update(i, { description: v })}
              placeholder="description"
              multiline
              className="text-sm leading-relaxed text-white/80"
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function Assumptions({ data, set }) {
  const assumptions = normalizeAssumptions(data.assumptions)
  if (assumptions.length === 0) return null
  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <p className="px-2 text-xs font-semibold uppercase tracking-wide text-white/40">Assumptions</p>
      <ul className="mt-1">
        {assumptions.map((note, i) => (
          <li key={i} className="flex gap-1.5 text-xs italic text-white/40">
            <span className="pt-1 text-white/25">•</span>
            <EditableText
              value={note}
              onChange={(v) => set('assumptions', assumptions.map((a, j) => (j === i ? v : a)))}
              className="text-xs italic text-white/40"
              multiline
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
