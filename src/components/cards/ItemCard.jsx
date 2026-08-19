import EditableText from '../EditableText'
import { DDB_ITEM_TYPES, DDB_RARITIES } from '../../lib/schemas'
import { Assumptions, Divider, Section } from './parts'
import { RARITY_COLORS } from './rarity'

const BASE_TYPES = ['Item', 'Armor', 'Weapon']

function ItemCard({ data, set }) {
  const rarityClass = RARITY_COLORS[data.rarity] ?? RARITY_COLORS.Common

  return (
    <>
      <EditableText
        value={data.name}
        onChange={(v) => set('name', v)}
        className="text-2xl font-bold text-white"
        placeholder="Item name"
      />

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm italic text-white/60">
        {/* D&D Beyond splits this into a base type plus a closed Type list. */}
        <select
          value={BASE_TYPES.includes(data.itemBaseType) ? data.itemBaseType : 'Item'}
          onChange={(e) => set('itemBaseType', e.target.value)}
          className="rounded-md border-0 bg-transparent text-sm italic text-white/60"
        >
          {BASE_TYPES.map((t) => (
            <option key={t} value={t} className="bg-[#151221] text-white not-italic">{t}</option>
          ))}
        </select>
        {data.itemBaseType === 'Item' || !data.itemBaseType ? (
          <select
            value={DDB_ITEM_TYPES.includes(data.itemType) ? data.itemType : 'Wondrous Item'}
            onChange={(e) => set('itemType', e.target.value)}
            className="rounded-md border-0 bg-transparent text-sm italic text-white/60"
          >
            {DDB_ITEM_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[#151221] text-white not-italic">{t}</option>
            ))}
          </select>
        ) : (
          <EditableText
            value={data.itemBaseType === 'Armor' ? data.baseArmor : data.baseWeapon}
            onChange={(v) => set(data.itemBaseType === 'Armor' ? 'baseArmor' : 'baseWeapon', v)}
            className="!inline-block !w-auto text-sm italic text-white/60"
            placeholder={data.itemBaseType === 'Armor' ? 'Leather' : 'Dagger'}
          />
        )}
        <span>,</span>
        <select
          value={data.rarity ?? 'Common'}
          onChange={(e) => set('rarity', e.target.value)}
          className={`rounded-md border-0 bg-transparent text-sm italic ${rarityClass.split(' ')[1]}`}
        >
          {DDB_RARITIES.map((r) => (
            <option key={r} value={r} className="bg-[#151221] text-white not-italic">
              {r}
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-1.5 not-italic text-white/50">
          <input
            type="checkbox"
            checked={Boolean(data.requiresAttunement)}
            onChange={(e) => set('requiresAttunement', e.target.checked)}
            className="h-4 w-4 accent-purple-400"
          />
          requires attunement
        </label>
      </div>

      {data.requiresAttunement && (
        <EditableText
          value={data.attunementRequirement}
          onChange={(v) => set('attunementRequirement', v)}
          className="px-2 text-xs text-white/50"
          placeholder="attunement requirement (e.g. by a spellcaster)"
        />
      )}

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

      <Section title="Properties">
        <EditableText
          value={data.properties}
          onChange={(v) => set('properties', v)}
          className="mt-1 text-sm leading-relaxed text-white/80"
          placeholder="Mechanical rules text"
          multiline
        />
      </Section>

      <div className="mt-4 flex gap-4 px-2 text-sm text-white/60">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Weight</p>
          <EditableText
            value={data.weight}
            onChange={(v) => set('weight', v)}
            className="!px-0 text-sm text-white/70"
            placeholder="—"
          />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Value</p>
          <EditableText
            value={data.value}
            onChange={(v) => set('value', v)}
            className="!px-0 text-sm text-white/70"
            placeholder="—"
          />
        </div>
      </div>

      <Assumptions data={data} set={set} />
    </>
  )
}

export default ItemCard
