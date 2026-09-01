/** Helpers shared by the preview cards and exporters. */

export function abilityModifier(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return '—'
  const mod = Math.floor((n - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/** Comma-joined editing is far friendlier on a phone than per-item rows. */
export function joinList(list) {
  if (!Array.isArray(list)) return list || ''
  return list.join(', ')
}

export function splitList(text) {
  return String(text || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function formatSpeed(speed) {
  if (!speed || typeof speed !== 'object') return String(speed || '')
  const parts = []
  if (speed.walk) parts.push(`${speed.walk} ft.`)
  for (const mode of ['fly', 'swim', 'climb', 'burrow']) {
    if (speed[mode]) parts.push(`${mode} ${speed[mode]} ft.`)
  }
  return parts.join(', ')
}

export function castingTimeText(data) {
  const value = data.castingTimeValue
  const activation = data.activation || ''
  if (!activation) return ''
  const unitLike = ['Minute', 'Hour'].includes(activation)
  const base = unitLike && value ? `${value} ${activation}${value === 1 ? '' : 's'}` : activation
  return data.castingTimeDescription ? `${base}, ${data.castingTimeDescription}` : base
}

export function rangeText(data) {
  if (data.rangeOrigin === 'Ranged') return data.range || 'Ranged'
  return data.rangeOrigin || data.range || ''
}

export function durationText(data) {
  const type = data.durationType || ''
  const amount = data.durationInterval && data.durationUnit
    ? `${data.durationInterval} ${data.durationUnit}${data.durationInterval === 1 ? '' : 's'}`
    : ''
  if (type === 'Concentration') return amount ? `Concentration, up to ${amount}` : 'Concentration'
  if (type === 'Time') return amount || 'Time'
  return type
}

export function hitPointsText(data) {
  const count = data.hitPointDieCount
  const die = data.hitPointDieValue
  if (!count || !die) return String(data.averageHitPoints ?? '')
  const mod = data.hitPointModifier
  const modText = mod ? ` ${mod > 0 ? '+' : '-'} ${Math.abs(mod)}` : ''
  return `${data.averageHitPoints ?? ''} (${count}${die}${modText})`.trim()
}

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

export function spellLevelText(data) {
  const level = Number(data.level)
  const school = data.school || ''
  if (level === 0) return `${school} cantrip`.trim()
  const ordinal = ORDINALS[level] || `${data.level}`
  return `${ordinal}-level ${school}`.trim()
}

/**
 * The real 5e "At Higher Levels" text never enumerates per-level totals —
 * Fireball's actual wording states the formula once and stops — which is
 * exactly where a local model tends to go wrong, inventing wrong numbers or
 * character-level breakpoints when asked to write the full paragraph itself.
 * Computed here from structured fields so it's always correct regardless of
 * what the model wrote; falls back to freeform text for spells that scale
 * some other way (more targets, longer duration, etc).
 */
export function higherLevelScalingText(data) {
  const dice = data.higherLevelScaling?.dice
  if (!dice) return data.atHigherLevels || ''

  const level = Number(data.level)
  // A cantrip has no spell slot to upcast with; a 9th-level spell has no
  // higher slot to cast it from. Neither can use this scaling.
  if (!Number.isFinite(level) || level < 1 || level > 8) return data.atHigherLevels || ''

  const effect = String(data.higherLevelScaling.effect || 'damage').trim() || 'damage'
  const base = ORDINALS[level]
  const next = ORDINALS[level + 1]
  return `When you cast this spell using a spell slot of ${next} level or higher, the ${effect} increases by ${dice} for each slot level above ${base}.`
}

export function componentsText(components) {
  if (!components || typeof components !== 'object') return String(components || '')
  const parts = []
  if (components.verbal) parts.push('V')
  if (components.somatic) parts.push('S')
  if (components.material) parts.push('M')
  let text = parts.join(', ')
  if (components.material && components.materialDescription) {
    text += ` (${components.materialDescription})`
  }
  return text
}
