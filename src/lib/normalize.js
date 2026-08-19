import {
  DDB_ACTIVATIONS,
  DDB_DURATION_TYPES,
  DDB_DURATION_UNITS,
  DDB_HIT_DIE_VALUES,
  DDB_ITEM_TYPES,
  DDB_MONSTER_TYPES,
  DDB_RANGE_ORIGINS,
  DDB_RARITIES,
  DDB_SCHOOLS,
  DDB_SIZES,
  normalizeAssumptions,
} from './schemas'

/**
 * Cleans a freshly parsed entry before it reaches the card or the library:
 * drops fields that don't apply to the shape the model chose, canonicalises
 * enum casing, and migrates the older field shapes a model may still produce.
 * Unknown extra keys are left alone — they're harmless and may carry meaning.
 */

/** Case-insensitive match against a legal set; null when there's no match. */
function canonical(value, options) {
  if (value === null || value === undefined) return null
  const needle = String(value).trim().toLowerCase()
  return options.find((o) => String(o).toLowerCase() === needle) ?? null
}

/**
 * Older entries stored a single free-text itemType like "Weapon (dagger)".
 * Recover the base type and the base item from it rather than dumping
 * everything into "Wondrous Item".
 */
function inferLegacyBase(itemType) {
  const raw = String(itemType || '').trim()
  if (!raw) return null
  const lower = raw.toLowerCase()
  // "Weapon (dagger)" -> "dagger"
  const inner = raw.match(/\(([^)]+)\)/)?.[1]?.trim()
  if (/armou?r|shield/.test(lower)) {
    return { base: 'Armor', baseArmor: inner || (/^armou?r$/i.test(raw) ? null : raw) }
  }
  if (/weapon|sword|dagger|axe|bow|mace|spear|hammer|blade|flail|glaive|halberd|whip/.test(lower)) {
    return { base: 'Weapon', baseWeapon: inner || (/^weapon$/i.test(raw) ? null : raw) }
  }
  return null
}

function normalizeItem(data) {
  const out = { ...data }

  // Only infer when the entry predates the split (no explicit base type).
  if (!out.itemBaseType) {
    const legacy = inferLegacyBase(out.itemType)
    if (legacy) {
      out.itemBaseType = legacy.base
      if (legacy.baseArmor && !out.baseArmor) out.baseArmor = legacy.baseArmor
      if (legacy.baseWeapon && !out.baseWeapon) out.baseWeapon = legacy.baseWeapon
    }
  }

  out.itemBaseType = canonical(out.itemBaseType, ['Item', 'Armor', 'Weapon']) ?? 'Item'
  out.rarity = canonical(out.rarity, DDB_RARITIES) ?? out.rarity ?? 'Common'

  // Only one of type / baseArmor / baseWeapon applies to any given item.
  if (out.itemBaseType === 'Item') {
    out.itemType = canonical(out.itemType, DDB_ITEM_TYPES) ?? 'Wondrous Item'
    out.baseArmor = null
    out.baseWeapon = null
  } else if (out.itemBaseType === 'Armor') {
    out.itemType = null
    out.baseWeapon = null
  } else {
    out.itemType = null
    out.baseArmor = null
  }

  if (!out.requiresAttunement) out.attunementRequirement = null
  return out
}

function normalizeSpell(data) {
  const out = { ...data }

  out.school = canonical(out.school, DDB_SCHOOLS) ?? out.school
  out.rangeOrigin = canonical(out.rangeOrigin, DDB_RANGE_ORIGINS) ?? 'Self'

  // Legacy: a single "1 action" string instead of value + activation.
  if (out.castingTime && out.castingTimeValue == null) {
    const match = String(out.castingTime).match(/(\d+)?\s*(action|bonus action|reaction|minute|hour)/i)
    if (match) {
      out.castingTimeValue = Number(match[1] || 1)
      out.activation = canonical(match[2], DDB_ACTIVATIONS) ?? out.activation
    }
  }
  delete out.castingTime
  out.activation = canonical(out.activation, DDB_ACTIVATIONS) ?? 'Action'
  if (out.castingTimeValue == null) out.castingTimeValue = 1

  // Legacy: concentration as a boolean plus a free-text duration.
  let durationType = canonical(out.durationType, DDB_DURATION_TYPES)
  if (!durationType && out.concentration) durationType = 'Concentration'
  if (out.duration && out.durationInterval == null) {
    const match = String(out.duration).match(/(\d+)\s*(round|minute|hour|day)/i)
    if (match) {
      out.durationInterval = Number(match[1])
      out.durationUnit = canonical(match[2], DDB_DURATION_UNITS)
      if (!durationType) durationType = 'Time'
    }
  }
  delete out.concentration
  delete out.duration
  out.durationType = durationType ?? 'Instantaneous'
  out.durationUnit = canonical(out.durationUnit, DDB_DURATION_UNITS)

  // An interval only means something for a timed or concentration duration.
  if (!['Concentration', 'Time'].includes(out.durationType)) {
    out.durationInterval = null
    out.durationUnit = null
  }

  // A distance only applies to a ranged spell.
  if (out.rangeOrigin !== 'Ranged') out.range = null

  const components = out.components && typeof out.components === 'object' ? { ...out.components } : null
  if (components) {
    if (!components.material) components.materialDescription = null
    out.components = components
  }

  // Keep the flag and the text in step rather than trusting either alone.
  const higher = out.atHigherLevels && String(out.atHigherLevels).trim()
  out.canCastAtHigherLevel = Boolean(higher)
  if (!higher) out.atHigherLevels = null

  return out
}

function normalizeMonster(data) {
  const out = { ...data }

  out.size = canonical(out.size, DDB_SIZES) ?? out.size
  out.creatureType = canonical(out.creatureType, DDB_MONSTER_TYPES) ?? out.creatureType
  if (out.challengeRating != null) out.challengeRating = String(out.challengeRating)

  // Legacy: hitPoints + a combined "6d8 + 18" string.
  if (out.hitPoints != null && out.averageHitPoints == null) out.averageHitPoints = out.hitPoints
  delete out.hitPoints
  if (out.hitDice && out.hitPointDieCount == null) {
    const match = String(out.hitDice).match(/(\d+)\s*(d\d+)\s*([+-]\s*\d+)?/i)
    if (match) {
      out.hitPointDieCount = Number(match[1])
      out.hitPointDieValue = match[2].toLowerCase()
      out.hitPointModifier = match[3] ? Number(match[3].replace(/\s+/g, '')) : 0
    }
  }
  delete out.hitDice
  out.hitPointDieValue = canonical(out.hitPointDieValue, DDB_HIT_DIE_VALUES) ?? out.hitPointDieValue

  // Legacy name, and a field D&D Beyond derives from CR rather than storing.
  if (out.armorClassSource && !out.armorClassType) out.armorClassType = out.armorClassSource
  delete out.armorClassSource
  delete out.proficiencyBonus

  // Empty optional blocks read better as absent than as empty sections.
  for (const key of ['bonusActions', 'reactions', 'legendaryActions']) {
    if (Array.isArray(out[key]) && out[key].length === 0) out[key] = null
  }

  return out
}

function normalizeFeat(data) {
  const out = { ...data }
  if (!Array.isArray(out.benefits)) out.benefits = out.benefits ? [out.benefits] : []
  if (!out.snippet && out.description) {
    out.snippet = String(out.description).split(/(?<=\.)\s/)[0].slice(0, 120)
  }
  return out
}

const BY_TYPE = {
  item: normalizeItem,
  spell: normalizeSpell,
  monster: normalizeMonster,
  feat: normalizeFeat,
}

export function normalizeEntry(contentType, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data
  const normalize = BY_TYPE[contentType]
  const out = normalize ? normalize(data) : { ...data }
  out.assumptions = normalizeAssumptions(out.assumptions)
  return out
}
