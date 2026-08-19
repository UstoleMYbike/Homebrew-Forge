import EditableText from '../EditableText'
import { abilityModifier, formatSpeed, hitPointsText, joinList, splitList } from '../../lib/fields'
import { DDB_HIT_DIE_VALUES } from '../../lib/schemas'
import { Assumptions, Divider, NamedEntries, Section, StatLine } from './parts'

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const LIST_FIELDS = [
  ['savingThrows', 'Saving Throws'],
  ['skills', 'Skills'],
  ['damageResistances', 'Resistances'],
  ['damageImmunities', 'Immunities'],
  ['conditionImmunities', 'Condition Immunities'],
]

function MonsterCard({ data, set }) {
  const scores = data.abilityScores && typeof data.abilityScores === 'object' ? data.abilityScores : {}
  const speed = data.speed && typeof data.speed === 'object' ? data.speed : {}

  function setScore(key, value) {
    set('abilityScores', { ...scores, [key]: value })
  }

  return (
    <>
      <EditableText
        value={data.name}
        onChange={(v) => set('name', v)}
        className="text-2xl font-bold text-white"
        placeholder="Creature name"
      />

      <p className="px-2 text-sm italic text-white/60">
        {[data.size, data.creatureType].filter(Boolean).join(' ')}
        {data.alignment ? `, ${data.alignment}` : ''}
      </p>

      <Divider />

      <div className="flex flex-col gap-1">
        <StatLine label="Armor Class" value={data.armorClass} onChange={(v) => set('armorClass', v)} numeric />
        <StatLine
          label="AC Type"
          value={data.armorClassType}
          onChange={(v) => set('armorClassType', v)}
          placeholder="natural armor"
        />
        <div className="flex items-baseline gap-2 px-2 text-sm">
          <span className="shrink-0 font-semibold text-white/70">Hit Points</span>
          <span className="text-white/80">{hitPointsText(data) || '—'}</span>
        </div>
        {/* D&D Beyond takes hit dice as three separate inputs. */}
        <div className="no-print flex flex-wrap items-center gap-1.5 px-2 text-xs text-white/40">
          <EditableText
            value={data.averageHitPoints}
            onChange={(v) => set('averageHitPoints', v)}
            numeric
            placeholder="avg"
            className="!w-12 !px-1 text-xs text-white/70"
          />
          <span>=</span>
          <EditableText
            value={data.hitPointDieCount}
            onChange={(v) => set('hitPointDieCount', v)}
            numeric
            placeholder="6"
            className="!w-9 !px-1 text-xs text-white/70"
          />
          <select
            value={DDB_HIT_DIE_VALUES.includes(data.hitPointDieValue) ? data.hitPointDieValue : 'd8'}
            onChange={(e) => set('hitPointDieValue', e.target.value)}
            className="rounded-md border-0 bg-transparent text-xs text-white/70"
          >
            {DDB_HIT_DIE_VALUES.map((d) => (
              <option key={d} value={d} className="bg-[#151221]">{d}</option>
            ))}
          </select>
          <span>+</span>
          <EditableText
            value={data.hitPointModifier}
            onChange={(v) => set('hitPointModifier', v)}
            numeric
            placeholder="0"
            className="!w-10 !px-1 text-xs text-white/70"
          />
        </div>
        <div className="flex items-baseline gap-2 px-2 text-sm">
          <span className="shrink-0 font-semibold text-white/70">Speed</span>
          <span className="text-white/80">{formatSpeed(speed) || '—'}</span>
        </div>
        <div className="no-print flex flex-wrap gap-2 px-2 pt-1">
          {['walk', 'fly', 'swim', 'climb', 'burrow'].map((mode) => (
            <div key={mode} className="flex items-center gap-1 text-xs text-white/40">
              <span className="capitalize">{mode}</span>
              <EditableText
                value={speed[mode]}
                onChange={(v) => set('speed', { ...speed, [mode]: v })}
                numeric
                placeholder="—"
                className="!w-10 !px-1 text-xs text-white/70"
              />
            </div>
          ))}
        </div>
      </div>

      <Divider />

      <div className="grid grid-cols-6 gap-1 px-1 text-center">
        {ABILITIES.map((key) => (
          <div key={key}>
            <p className="text-[11px] font-bold uppercase text-white/50">{key}</p>
            <EditableText
              value={scores[key]}
              onChange={(v) => setScore(key, v)}
              numeric
              placeholder="10"
              className="!px-0 text-center text-sm font-semibold text-white"
            />
            <p className="text-[11px] text-white/40">{abilityModifier(scores[key])}</p>
          </div>
        ))}
      </div>

      <Divider />

      <div className="flex flex-col gap-1">
        {LIST_FIELDS.map(([field, label]) => {
          const value = joinList(data[field])
          if (!value) return null
          return (
            <StatLine
              key={field}
              label={label}
              value={value}
              onChange={(v) => set(field, splitList(v))}
            />
          )
        })}
        <StatLine label="Senses" value={data.senses} onChange={(v) => set('senses', v)} />
        <StatLine label="Languages" value={data.languages} onChange={(v) => set('languages', v)} />
        <StatLine
          label="Challenge"
          value={data.challengeRating}
          onChange={(v) => set('challengeRating', v)}
        />
        <StatLine
          label="Passive Perception"
          value={data.passivePerception}
          onChange={(v) => set('passivePerception', v)}
          numeric
        />
      </div>

      {data.description && (
        <Section title="Description">
          <EditableText
            value={data.description}
            onChange={(v) => set('description', v)}
            className="mt-1 text-sm leading-relaxed text-white/80"
            multiline
          />
        </Section>
      )}

      <NamedEntries
        title="Traits"
        entries={data.traits}
        onChange={(v) => set('traits', v)}
        addLabel="trait"
      />
      <NamedEntries
        title="Actions"
        entries={data.actions}
        onChange={(v) => set('actions', v)}
        addLabel="action"
      />
      <NamedEntries
        title="Bonus Actions"
        entries={data.bonusActions}
        onChange={(v) => set('bonusActions', v)}
        addLabel="bonus action"
      />
      <NamedEntries
        title="Reactions"
        entries={data.reactions}
        onChange={(v) => set('reactions', v)}
        addLabel="reaction"
      />
      <NamedEntries
        title="Legendary Actions"
        entries={data.legendaryActions}
        onChange={(v) => set('legendaryActions', v)}
        addLabel="legendary action"
      />

      <Assumptions data={data} set={set} />
    </>
  )
}

export default MonsterCard
