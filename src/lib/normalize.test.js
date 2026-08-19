import { describe, expect, it } from 'vitest'
import { normalizeEntry } from './normalize'

describe('item normalization', () => {
  it('strips fields that do not apply to the chosen base type', () => {
    // The exact drift llama3.1 produced: a Weapon carrying a stray itemType.
    const out = normalizeEntry('item', {
      name: 'X', itemBaseType: 'Weapon', itemType: 'Rod',
      baseWeapon: 'Dagger', baseArmor: 'Plate',
    })
    expect(out.itemType).toBeNull()
    expect(out.baseArmor).toBeNull()
    expect(out.baseWeapon).toBe('Dagger')
  })

  it('clears the attunement note when attunement is not required', () => {
    const out = normalizeEntry('item', {
      name: 'X', requiresAttunement: false, attunementRequirement: 'by a druid',
    })
    expect(out.attunementRequirement).toBeNull()
  })

  it('canonicalises enum casing', () => {
    const out = normalizeEntry('item', { name: 'X', itemBaseType: 'item', rarity: 'rare' })
    expect(out.itemBaseType).toBe('Item')
    expect(out.rarity).toBe('Rare')
  })

  it('falls back to Wondrous Item for a type D&D Beyond does not offer', () => {
    const out = normalizeEntry('item', { name: 'X', itemBaseType: 'Item', itemType: 'Lantern' })
    expect(out.itemType).toBe('Wondrous Item')
  })

  it('recovers base type and base item from a legacy free-text itemType', () => {
    // Entries saved before the base-type split stored "Weapon (dagger)".
    const out = normalizeEntry('item', { name: 'X', itemType: 'Weapon (dagger)' })
    expect(out.itemBaseType).toBe('Weapon')
    expect(out.baseWeapon).toBe('dagger')
  })

  it('does not override an explicit base type with legacy inference', () => {
    const out = normalizeEntry('item', { name: 'X', itemBaseType: 'Item', itemType: 'Ring' })
    expect(out.itemBaseType).toBe('Item')
    expect(out.itemType).toBe('Ring')
  })
})

describe('spell normalization', () => {
  it('migrates a concentration boolean into a duration type', () => {
    // D&D Beyond models concentration as a duration type, not a flag.
    const out = normalizeEntry('spell', {
      name: 'S', concentration: true, duration: '1 minute', castingTime: '1 action',
    })
    expect(out.durationType).toBe('Concentration')
    expect(out.durationInterval).toBe(1)
    expect(out.durationUnit).toBe('Minute')
    expect(out).not.toHaveProperty('concentration')
    expect(out).not.toHaveProperty('duration')
  })

  it('migrates a legacy casting time string', () => {
    const out = normalizeEntry('spell', { name: 'S', castingTime: '1 action' })
    expect(out.castingTimeValue).toBe(1)
    expect(out.activation).toBe('Action')
    expect(out).not.toHaveProperty('castingTime')
  })

  it('drops interval and unit for an instantaneous spell', () => {
    const out = normalizeEntry('spell', {
      name: 'S', durationType: 'Instantaneous', durationInterval: 1, durationUnit: 'Minute',
    })
    expect(out.durationInterval).toBeNull()
    expect(out.durationUnit).toBeNull()
  })

  it('drops range unless the spell is ranged', () => {
    expect(normalizeEntry('spell', { name: 'S', rangeOrigin: 'Self', range: '60 feet' }).range).toBeNull()
    expect(normalizeEntry('spell', { name: 'S', rangeOrigin: 'Ranged', range: '30 feet' }).range).toBe('30 feet')
  })

  it('clears the material description when there is no material component', () => {
    const out = normalizeEntry('spell', {
      name: 'S',
      components: { verbal: true, somatic: false, material: false, materialDescription: 'soot' },
    })
    expect(out.components.materialDescription).toBeNull()
  })

  it('keeps the higher-level flag in step with the text', () => {
    expect(normalizeEntry('spell', { name: 'S', atHigherLevels: '' }).canCastAtHigherLevel).toBe(false)
    expect(normalizeEntry('spell', { name: 'S', atHigherLevels: 'More damage.' }).canCastAtHigherLevel).toBe(true)
  })
})

describe('monster normalization', () => {
  it('splits a legacy hit dice string into its parts', () => {
    const out = normalizeEntry('monster', { name: 'M', hitPoints: 45, hitDice: '6d8 + 18' })
    expect(out.averageHitPoints).toBe(45)
    expect(out.hitPointDieCount).toBe(6)
    expect(out.hitPointDieValue).toBe('d8')
    expect(out.hitPointModifier).toBe(18)
    expect(out).not.toHaveProperty('hitDice')
    expect(out).not.toHaveProperty('hitPoints')
  })

  it('renames armorClassSource and drops proficiencyBonus', () => {
    const out = normalizeEntry('monster', {
      name: 'M', armorClassSource: 'natural armor', proficiencyBonus: 3,
    })
    expect(out.armorClassType).toBe('natural armor')
    expect(out).not.toHaveProperty('armorClassSource')
    expect(out).not.toHaveProperty('proficiencyBonus')
  })

  it('canonicalises enums and stringifies the challenge rating', () => {
    const out = normalizeEntry('monster', {
      name: 'M', size: 'medium', creatureType: 'undead', challengeRating: 5,
    })
    expect(out.size).toBe('Medium')
    expect(out.creatureType).toBe('Undead')
    expect(out.challengeRating).toBe('5')
  })

  it('nulls empty optional blocks so the card renders no empty sections', () => {
    const out = normalizeEntry('monster', { name: 'M', bonusActions: [], reactions: [] })
    expect(out.bonusActions).toBeNull()
    expect(out.reactions).toBeNull()
  })
})

describe('feat normalization', () => {
  it('coerces a string benefit into a list', () => {
    expect(normalizeEntry('feat', { name: 'F', benefits: 'single' }).benefits).toEqual(['single'])
  })

  it('derives a snippet from the first sentence when one is missing', () => {
    const out = normalizeEntry('feat', { name: 'F', description: 'First sentence here. Second one.' })
    expect(out.snippet).toBe('First sentence here.')
  })
})

describe('assumptions', () => {
  it('always comes back as an array', () => {
    expect(normalizeEntry('item', { name: 'X', assumptions: 'one note' }).assumptions).toEqual(['one note'])
    expect(normalizeEntry('item', { name: 'X' }).assumptions).toEqual([])
  })
})
