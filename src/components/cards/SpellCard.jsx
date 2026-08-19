import EditableText from '../EditableText'
import {
  castingTimeText,
  componentsText,
  durationText,
  joinList,
  rangeText,
  spellLevelText,
  splitList,
} from '../../lib/fields'
import { DDB_ACTIVATIONS, DDB_DURATION_TYPES, DDB_RANGE_ORIGINS } from '../../lib/schemas'
import { Assumptions, Divider, Section } from './parts'

function SpellCard({ data, set }) {
  const components = data.components && typeof data.components === 'object' ? data.components : {}

  function setComponent(key, value) {
    set('components', { ...components, [key]: value })
  }

  return (
    <>
      <EditableText
        value={data.name}
        onChange={(v) => set('name', v)}
        className="text-2xl font-bold text-white"
        placeholder="Spell name"
      />

      <p className="px-2 text-sm italic text-white/60">
        {spellLevelText(data) || 'Level and school'}
        {data.ritual ? ' (ritual)' : ''}
      </p>

      <Divider />

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2 px-2 text-sm">
          <span className="shrink-0 font-semibold text-white/70">Casting Time</span>
          <span className="text-white/80">{castingTimeText(data) || '—'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-2 text-xs text-white/50">
          <EditableText
            value={data.castingTimeValue}
            onChange={(v) => set('castingTimeValue', v)}
            numeric
            placeholder="1"
            className="!w-10 !px-1 text-xs text-white/70"
          />
          <select
            value={DDB_ACTIVATIONS.includes(data.activation) ? data.activation : 'Action'}
            onChange={(e) => set('activation', e.target.value)}
            className="rounded-md border-0 bg-transparent text-xs text-white/70"
          >
            {DDB_ACTIVATIONS.map((a) => (
              <option key={a} value={a} className="bg-[#151221]">{a}</option>
            ))}
          </select>
        </div>

        <div className="flex items-baseline gap-2 px-2 text-sm">
          <span className="shrink-0 font-semibold text-white/70">Range</span>
          <span className="text-white/80">{rangeText(data) || '—'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-2 text-xs text-white/50">
          <select
            value={DDB_RANGE_ORIGINS.includes(data.rangeOrigin) ? data.rangeOrigin : 'Self'}
            onChange={(e) => set('rangeOrigin', e.target.value)}
            className="rounded-md border-0 bg-transparent text-xs text-white/70"
          >
            {DDB_RANGE_ORIGINS.map((o) => (
              <option key={o} value={o} className="bg-[#151221]">{o}</option>
            ))}
          </select>
          {data.rangeOrigin === 'Ranged' && (
            <EditableText
              value={data.range}
              onChange={(v) => set('range', v)}
              placeholder="60 feet"
              className="!w-24 !px-1 text-xs text-white/70"
            />
          )}
        </div>
        <div className="flex items-baseline gap-2 px-2 text-sm">
          <span className="shrink-0 font-semibold text-white/70">Components</span>
          <span className="text-sm text-white/80">{componentsText(components) || '—'}</span>
        </div>
        <div className="flex flex-wrap gap-3 px-2 pt-1 text-xs text-white/50">
          {['verbal', 'somatic', 'material'].map((key) => (
            <label key={key} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={Boolean(components[key])}
                onChange={(e) => setComponent(key, e.target.checked)}
                className="h-3.5 w-3.5 accent-purple-400"
              />
              {key.charAt(0).toUpperCase()}
            </label>
          ))}
        </div>
        {components.material && (
          <EditableText
            value={components.materialDescription}
            onChange={(v) => setComponent('materialDescription', v)}
            className="px-2 text-xs text-white/50"
            placeholder="material component (e.g. a pinch of soot)"
          />
        )}
        <div className="flex items-baseline gap-2 px-2 text-sm">
          <span className="shrink-0 font-semibold text-white/70">Duration</span>
          <span className="text-white/80">{durationText(data) || '—'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-2 text-xs text-white/50">
          {/* Concentration is a duration type on D&D Beyond, not a checkbox. */}
          <select
            value={DDB_DURATION_TYPES.includes(data.durationType) ? data.durationType : 'Instantaneous'}
            onChange={(e) => set('durationType', e.target.value)}
            className="rounded-md border-0 bg-transparent text-xs text-white/70"
          >
            {DDB_DURATION_TYPES.map((d) => (
              <option key={d} value={d} className="bg-[#151221]">{d}</option>
            ))}
          </select>
          {['Concentration', 'Time'].includes(data.durationType) && (
            <>
              <EditableText
                value={data.durationInterval}
                onChange={(v) => set('durationInterval', v)}
                numeric
                placeholder="1"
                className="!w-10 !px-1 text-xs text-white/70"
              />
              <select
                value={data.durationUnit || 'Minute'}
                onChange={(e) => set('durationUnit', e.target.value)}
                className="rounded-md border-0 bg-transparent text-xs text-white/70"
              >
                {['Round', 'Minute', 'Hour', 'Day'].map((u) => (
                  <option key={u} value={u} className="bg-[#151221]">{u}</option>
                ))}
              </select>
            </>
          )}
          <label className="ml-auto flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={Boolean(data.ritual)}
              onChange={(e) => set('ritual', e.target.checked)}
              className="h-3.5 w-3.5 accent-purple-400"
            />
            ritual
          </label>
        </div>
      </div>

      <Divider />

      <Section title="Description">
        <EditableText
          value={data.description}
          onChange={(v) => set('description', v)}
          className="mt-1 text-sm leading-relaxed text-white/80"
          placeholder="What the spell does"
          multiline
        />
      </Section>

      {data.atHigherLevels && (
        <Section title="At Higher Levels">
          <EditableText
            value={data.atHigherLevels}
            onChange={(v) => set('atHigherLevels', v)}
            className="mt-1 text-sm leading-relaxed text-white/80"
            multiline
          />
        </Section>
      )}

      <Section title="Classes">
        <EditableText
          value={joinList(data.classes)}
          onChange={(v) => set('classes', splitList(v))}
          className="mt-1 text-sm text-white/80"
          placeholder="Wizard, Sorcerer"
        />
      </Section>

      <Assumptions data={data} set={set} />
    </>
  )
}

export default SpellCard
