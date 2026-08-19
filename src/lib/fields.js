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

export function spellLevelText(data) {
  const level = Number(data.level)
  const school = data.school || ''
  if (level === 0) return `${school} cantrip`.trim()
  const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']
  const ordinal = ordinals[level] || `${data.level}`
  return `${ordinal}-level ${school}`.trim()
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
