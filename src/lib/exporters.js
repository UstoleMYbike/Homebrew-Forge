import { DDB_ITEM_TYPES, DDB_RARITIES, normalizeAssumptions } from './schemas'
import {
  abilityModifier,
  castingTimeText,
  componentsText,
  durationText,
  formatSpeed,
  hitPointsText,
  joinList,
  rangeText,
  spellLevelText,
} from './fields'

/**
 * Homebrewery-style Markdown. Built deterministically rather than through the
 * model — the layout is fixed, so a local round-trip would only add latency
 * and a chance of the model improvising.
 */
export function toHomebreweryMarkdown(contentType, data) {
  if (contentType === 'item') return itemMarkdown(data)
  if (contentType === 'spell') return spellMarkdown(data)
  if (contentType === 'monster') return monsterMarkdown(data)
  if (contentType === 'feat') return featMarkdown(data)
  return genericMarkdown(data)
}

function assumptionsBlock(data, lines) {
  const assumptions = normalizeAssumptions(data.assumptions)
  if (assumptions.length === 0) return
  lines.push('', '> **Assumptions**')
  for (const note of assumptions) lines.push(`> - ${note}`)
}

function spellMarkdown(data) {
  const lines = [`#### ${data.name || 'Untitled'}`]
  const subtitle = spellLevelText(data)
  if (subtitle) lines.push(`*${subtitle}${data.ritual ? ' (ritual)' : ''}*`)
  lines.push('___')

  const meta = [
    ['Casting Time', castingTimeText(data)],
    ['Range', rangeText(data)],
    ['Components', componentsText(data.components)],
    ['Duration', durationText(data)],
  ]
  for (const [label, value] of meta) {
    if (value) lines.push(`- **${label}:** ${value}`)
  }

  if (data.description) lines.push('', data.description.trim())
  if (data.atHigherLevels) lines.push('', `***At Higher Levels.*** ${data.atHigherLevels.trim()}`)
  const classes = joinList(data.classes)
  if (classes) lines.push('', `**Classes:** ${classes}`)

  assumptionsBlock(data, lines)
  return lines.join('\n')
}

/** Homebrewery renders a blockquote-prefixed block as a monster stat block. */
function monsterMarkdown(data) {
  const scores = data.abilityScores && typeof data.abilityScores === 'object' ? data.abilityScores : {}
  const lines = ['___', `> ## ${data.name || 'Untitled'}`]

  const descriptor = [data.size, data.creatureType].filter(Boolean).join(' ')
  if (descriptor || data.alignment) {
    lines.push(`> *${descriptor}${data.alignment ? `, ${data.alignment}` : ''}*`)
  }
  lines.push('> ___')

  const ac = data.armorClassType
    ? `${data.armorClass} (${data.armorClassType})`
    : data.armorClass
  if (ac) lines.push(`> - **Armor Class** ${ac}`)
  const hp = hitPointsText(data)
  if (hp) lines.push(`> - **Hit Points** ${hp}`)
  const speed = formatSpeed(data.speed)
  if (speed) lines.push(`> - **Speed** ${speed}`)

  lines.push('> ___')
  lines.push('> |STR|DEX|CON|INT|WIS|CHA|')
  lines.push('> |:---:|:---:|:---:|:---:|:---:|:---:|')
  const cells = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((key) => {
    const score = scores[key]
    return score == null ? '—' : `${score} (${abilityModifier(score)})`
  })
  lines.push(`> |${cells.join('|')}|`)
  lines.push('> ___')

  const traitLines = [
    ['Saving Throws', joinList(data.savingThrows)],
    ['Skills', joinList(data.skills)],
    ['Damage Resistances', joinList(data.damageResistances)],
    ['Damage Immunities', joinList(data.damageImmunities)],
    ['Condition Immunities', joinList(data.conditionImmunities)],
    ['Senses', data.senses],
    ['Languages', data.languages],
    ['Challenge', data.challengeRating],
    ['Passive Perception', data.passivePerception],
  ]
  for (const [label, value] of traitLines) {
    if (value) lines.push(`> - **${label}** ${value}`)
  }

  const section = (title, entries) => {
    const list = Array.isArray(entries) ? entries.filter(Boolean) : []
    if (list.length === 0) return
    lines.push('> ___')
    if (title) lines.push(`> ### ${title}`)
    for (const entry of list) {
      lines.push(`> ***${entry.name || 'Unnamed'}.*** ${entry.description || ''}`.trimEnd())
    }
  }

  section(null, data.traits)
  section('Actions', data.actions)
  section('Bonus Actions', data.bonusActions)
  section('Reactions', data.reactions)
  section('Legendary Actions', data.legendaryActions)

  if (data.description) lines.push('', data.description.trim())
  assumptionsBlock(data, lines)
  return lines.join('\n')
}

function featMarkdown(data) {
  const lines = [`#### ${data.name || 'Untitled'}`]
  const subtitle = [data.category ? `${data.category} Feat` : '', data.repeatable ? 'repeatable' : '']
    .filter(Boolean)
    .join(', ')
  if (subtitle) lines.push(`*${subtitle}*`)
  if (data.prerequisite) lines.push(`***Prerequisite:*** ${data.prerequisite}`)
  lines.push('___')

  if (data.description) lines.push('', data.description.trim())

  const benefits = Array.isArray(data.benefits) ? data.benefits.filter(Boolean) : []
  if (benefits.length) {
    lines.push('')
    for (const benefit of benefits) lines.push(`- ${benefit}`)
  }
  if (data.abilityScoreIncrease) {
    lines.push('', `***Ability Score Increase.*** ${data.abilityScoreIncrease}`)
  }

  assumptionsBlock(data, lines)
  return lines.join('\n')
}

function attunementSuffix(data) {
  if (!data.requiresAttunement) return ''
  const requirement = (data.attunementRequirement || '').trim()
  return requirement ? ` (requires attunement ${requirement})` : ' (requires attunement)'
}

function itemMarkdown(data) {
  const lines = [`#### ${data.name || 'Untitled'}`]

  const typeLabel = data.itemBaseType === 'Armor'
    ? `Armor (${data.baseArmor || 'any'})`
    : data.itemBaseType === 'Weapon'
      ? `Weapon (${data.baseWeapon || 'any'})`
      : data.itemType
  const subtitle = [typeLabel, (data.rarity || '').toLowerCase()]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ')
  if (subtitle || data.requiresAttunement) {
    lines.push(`*${subtitle}${attunementSuffix(data)}*`)
  }
  lines.push('___')

  if (data.description) lines.push('', data.description.trim())
  if (data.properties) lines.push('', data.properties.trim())

  const stats = []
  if (data.weight) stats.push(`**Weight** ${data.weight}`)
  if (data.value) stats.push(`**Value** ${data.value}`)
  if (stats.length) lines.push('', stats.join(' &middot; '))

  assumptionsBlock(data, lines)
  return lines.join('\n')
}

/** Fallback for content types whose generators aren't wired up yet. */
function genericMarkdown(data) {
  const lines = [`#### ${data.name || 'Untitled'}`, '___']
  for (const [key, value] of Object.entries(data)) {
    if (key === 'name' || value == null || value === '') continue
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      lines.push('', `**${label}**`)
      for (const item of value) {
        lines.push(`- ${typeof item === 'object' ? JSON.stringify(item) : item}`)
      }
    } else if (typeof value === 'object') {
      lines.push('', `**${label}** ${JSON.stringify(value)}`)
    } else {
      lines.push('', `**${label}** ${value}`)
    }
  }
  return lines.join('\n')
}

// --------------------------------------------------------- D&D Beyond ---
// Field names and order below were read directly off D&D Beyond's Homebrew
// Creator forms (/homebrew/creations/create-*/create), so this is a
// straight top-to-bottom paste rather than a guess.

function line(label, value) {
  if (value === null || value === undefined || value === '') return null
  return `${label}: ${value}`
}

function blockFrom(entries) {
  const list = Array.isArray(entries) ? entries.filter(Boolean) : []
  if (list.length === 0) return ''
  return list.map((e) => `${e.name || 'Unnamed'}. ${e.description || ''}`.trim()).join('\n\n')
}

function itemDdb(data) {
  // The schema now constrains these, but a local model can still drift, so
  // fall back to the nearest legal value rather than emitting something the
  // form won't accept.
  const base = ['Item', 'Armor', 'Weapon'].includes(data.itemBaseType) ? data.itemBaseType : 'Item'
  const type = base === 'Item'
    ? (DDB_ITEM_TYPES.includes(data.itemType) ? data.itemType : 'Wondrous Item')
    : null
  const rarity = DDB_RARITIES.find((r) => r.toLowerCase() === (data.rarity || '').toLowerCase())
  const description = [data.description, data.properties].filter(Boolean).join('\n\n')

  const out = [
    line('Name', data.name),
    line('Rarity', rarity || data.rarity),
    line('Item Base Type', base),
    line('Type', type),
    base === 'Armor' ? line('Base Armor', data.baseArmor) : null,
    base === 'Weapon' ? line('Base Weapon', data.baseWeapon) : null,
    line('Requires Attunement', data.requiresAttunement ? 'Yes' : 'No'),
    data.requiresAttunement ? line('Attunement Description', data.attunementRequirement) : null,
    line('Description', description),
  ].filter(Boolean)

  const notes = []
  if (base === 'Item' && data.itemType && !DDB_ITEM_TYPES.includes(data.itemType)) {
    notes.push(`"${data.itemType}" isn't one of D&D Beyond's item types — mapped to ${type}.`)
  }
  if (data.weight || data.value) {
    notes.push('D&D Beyond has no weight/value fields for magic items; those come from the base item.')
  }
  if (notes.length) out.push('', '--- notes ---', ...notes)
  return out.join('\n')
}

function spellDdb(data) {
  const level = Number(data.level) === 0 ? 'Cantrip' : { 1:'1st',2:'2nd',3:'3rd',4:'4th',5:'5th',6:'6th',7:'7th',8:'8th',9:'9th' }[Number(data.level)]
  const out = [
    line('Name', data.name),
    line('Spell Level', level || data.level),
    line('School', data.school),
    line('Casting Time', data.castingTimeValue),
    line('Activation', data.activation),
    line('Casting Time Description', data.castingTimeDescription),
    line('Components', componentsText(data.components)),
    line('Origin', data.rangeOrigin),
    data.rangeOrigin === 'Ranged' ? line('Range', data.range) : null,
    line('Duration', data.durationType),
    line('Duration Interval', data.durationInterval),
    line('Duration Unit', data.durationUnit),
    line('Description', data.description),
    line('Can Cast at Higher Level', data.canCastAtHigherLevel ? 'Yes' : 'No'),
    line('At Higher Levels', data.atHigherLevels),
    line('Ritual', data.ritual ? 'Yes' : 'No'),
    line('Classes', joinList(data.classes)),
  ].filter(Boolean)
  return out.join('\n')
}

function monsterDdb(data) {
  const scores = data.abilityScores || {}
  const out = [
    line('Name', data.name),
    line('Monster Type', data.creatureType),
    line('Sub Type', data.subType),
    line('Size', data.size),
    line('Alignment', data.alignment),
    line('Challenge Rating', data.challengeRating),
    line('Armor Class', data.armorClass),
    line('Armor Class Type', data.armorClassType),
    line('Average Hit Points', data.averageHitPoints),
    line('Hit Point Die Count', data.hitPointDieCount),
    line('Hit Point Die Value', data.hitPointDieValue),
    line('Hit Point Modifier', data.hitPointModifier),
    line('Speed', formatSpeed(data.speed)),
    line('STR', scores.str), line('DEX', scores.dex), line('CON', scores.con),
    line('INT', scores.int), line('WIS', scores.wis), line('CHA', scores.cha),
    line('Saving Throws', joinList(data.savingThrows)),
    line('Skills', joinList(data.skills)),
    line('Damage Resistances', joinList(data.damageResistances)),
    line('Damage Immunities', joinList(data.damageImmunities)),
    line('Condition Immunities', joinList(data.conditionImmunities)),
    line('Senses', data.senses),
    line('Passive Perception', data.passivePerception),
    line('Languages', data.languages),
    line('Special Traits', blockFrom(data.traits)),
    line('Actions', blockFrom(data.actions)),
    line('Bonus Actions', blockFrom(data.bonusActions)),
    line('Reactions', blockFrom(data.reactions)),
    line('Is Legendary', data.legendaryActions?.length ? 'Yes' : 'No'),
    line('Legendary Actions', blockFrom(data.legendaryActions)),
    line('Characteristics', data.description),
  ].filter(Boolean)
  return out.join('\n')
}

function featDdb(data) {
  // D&D Beyond's feat form has no prerequisite/category/benefit fields —
  // everything mechanical lives in the one description box.
  const body = [
    data.prerequisite ? `Prerequisite: ${data.prerequisite}` : '',
    data.description || '',
    ...(Array.isArray(data.benefits) ? data.benefits.map((b) => `• ${b}`) : []),
    data.abilityScoreIncrease || '',
  ].filter(Boolean).join('\n\n')

  const out = [
    line('Name', data.name),
    line('Description', body),
    line('Snippet', data.snippet),
  ].filter(Boolean)
  if (data.category) {
    out.push('', '--- notes ---', `D&D Beyond has no feat category field; "${data.category}" has no home on the form.`)
  }
  return out.join('\n')
}

export function toDndBeyondText(contentType, data) {
  if (contentType === 'item') return itemDdb(data)
  if (contentType === 'spell') return spellDdb(data)
  if (contentType === 'monster') return monsterDdb(data)
  if (contentType === 'feat') return featDdb(data)
  return genericMarkdown(data)
}

/** Returns true when the text made it to the clipboard. */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
