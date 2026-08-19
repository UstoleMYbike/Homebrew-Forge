import EditableText from '../EditableText'
import { Assumptions, Divider, Section } from './parts'

const CATEGORIES = ['Origin', 'General', 'Fighting Style', 'Epic Boon']

function FeatCard({ data, set }) {
  const benefits = Array.isArray(data.benefits) ? data.benefits : []

  return (
    <>
      <EditableText
        value={data.name}
        onChange={(v) => set('name', v)}
        className="text-2xl font-bold text-white"
        placeholder="Feat name"
      />

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm italic text-white/60">
        <select
          value={CATEGORIES.includes(data.category) ? data.category : 'General'}
          onChange={(e) => set('category', e.target.value)}
          className="rounded-md border-0 bg-transparent text-sm italic text-purple-300"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-[#151221] text-white not-italic">
              {c} Feat
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-1.5 not-italic text-white/50">
          <input
            type="checkbox"
            checked={Boolean(data.repeatable)}
            onChange={(e) => set('repeatable', e.target.checked)}
            className="h-4 w-4 accent-purple-400"
          />
          repeatable
        </label>
      </div>

      <div className="px-2 text-xs text-white/50">
        <span className="font-semibold">Prerequisite: </span>
        <EditableText
          value={data.prerequisite}
          onChange={(v) => set('prerequisite', v)}
          className="!inline-block !w-auto text-xs text-white/50"
          placeholder="none"
        />
      </div>

      <Divider />

      <Section title="Description">
        <EditableText
          value={data.description}
          onChange={(v) => set('description', v)}
          className="mt-1 text-sm leading-relaxed text-white/80"
          placeholder="Flavor text"
          multiline
        />
      </Section>

      {benefits.length > 0 && (
        <Section title="Benefits">
          <ul className="mt-1 flex flex-col gap-1.5">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex gap-1.5 text-sm text-white/80">
                <span className="pt-1 text-white/30">•</span>
                <EditableText
                  value={benefit}
                  onChange={(v) => set('benefits', benefits.map((b, j) => (j === i ? v : b)))}
                  className="text-sm leading-relaxed text-white/80"
                  multiline
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.abilityScoreIncrease && (
        <Section title="Ability Score Increase">
          <EditableText
            value={data.abilityScoreIncrease}
            onChange={(v) => set('abilityScoreIncrease', v)}
            className="mt-1 text-sm text-white/80"
          />
        </Section>
      )}

      <Assumptions data={data} set={set} />
    </>
  )
}

export default FeatCard
