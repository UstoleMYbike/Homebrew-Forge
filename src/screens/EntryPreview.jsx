import BalanceBadge from '../components/BalanceBadge'
import ExportBar from '../components/ExportBar'
import IterationBar from '../components/IterationBar'
import ItemCard from '../components/cards/ItemCard'
import { RARITY_COLORS } from '../components/cards/rarity'
import SpellCard from '../components/cards/SpellCard'
import MonsterCard from '../components/cards/MonsterCard'
import FeatCard from '../components/cards/FeatCard'
import { CONTENT_TYPES } from '../lib/schemas'

const CARDS = {
  item: ItemCard,
  spell: SpellCard,
  monster: MonsterCard,
  feat: FeatCard,
}

/** Items get a rarity-coloured border; the rest use a neutral one. */
function borderClass(contentType, data) {
  if (contentType !== 'item') return 'border-white/15'
  return (RARITY_COLORS[data.rarity] ?? RARITY_COLORS.Common).split(' ')[0]
}

function EntryPreview({ data, contentType = 'item', autoCheck = false, onChange, onBack }) {
  const Card = CARDS[contentType] ?? ItemCard

  function set(field, value) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="print-root flex min-h-dvh flex-col bg-[#151221] px-5 py-6 text-white [padding-top:max(1.5rem,env(safe-area-inset-top))] [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="no-print mx-auto flex w-full max-w-md items-center gap-3">
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
        <h1 className="text-lg font-semibold text-white/80">
          {CONTENT_TYPES[contentType]?.label ?? 'Entry'}
        </h1>
      </header>

      <div className="mx-auto mt-6 w-full max-w-md">
        <div className={`print-card rounded-2xl border-2 bg-white/[0.03] p-5 ${borderClass(contentType, data)}`}>
          <Card data={data} set={set} onChange={onChange} contentType={contentType} />
        </div>

        <BalanceBadge contentType={contentType} data={data} autoCheck={autoCheck} />

        <IterationBar contentType={contentType} data={data} onChange={onChange} />

        <ExportBar contentType={contentType} data={data} />
      </div>
    </div>
  )
}

export default EntryPreview
