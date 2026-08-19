import { describe, expect, it } from 'vitest'
import { toDndBeyondText, toHomebreweryMarkdown } from './exporters'

const ITEM = {
  name: 'Frostbite', itemBaseType: 'Weapon', itemType: null, baseWeapon: 'Dagger',
  rarity: 'Rare', requiresAttunement: true, attunementRequirement: 'by a spellcaster',
  description: 'A pale blade.', properties: '+1 to attack and damage.',
  weight: '1 lb.', value: '2,500 gp', assumptions: ['Assumed a dagger.'],
}

const SPELL = {
  name: 'Emberveil', level: 3, school: 'Evocation',
  castingTimeValue: 1, activation: 'Action', rangeOrigin: 'Self',
  components: { verbal: true, somatic: true, material: true, materialDescription: 'a pinch of soot' },
  durationType: 'Concentration', durationInterval: 1, durationUnit: 'Minute',
  ritual: false, canCastAtHigherLevel: true, atHigherLevels: 'Damage increases by 1d6.',
  classes: ['Wizard', 'Sorcerer'], description: 'A veil of embers surrounds you.', assumptions: [],
}

const MONSTER = {
  name: 'Bog Wraith', size: 'Medium', creatureType: 'Undead', alignment: 'Chaotic Evil',
  challengeRating: '5', armorClass: 14, armorClassType: 'natural armor',
  averageHitPoints: 45, hitPointDieCount: 6, hitPointDieValue: 'd8', hitPointModifier: 18,
  speed: { walk: 0, fly: 30, swim: 20 },
  abilityScores: { str: 8, dex: 16, con: 16, int: 10, wis: 12, cha: 15 },
  skills: ['Stealth +6'], senses: 'darkvision 60 ft.', languages: 'Common',
  traits: [{ name: 'Bog Stride', description: 'Moves through water freely.' }],
  actions: [{ name: 'Grasp', description: '2d8 necrotic.' }],
  description: 'A drowned thing.', assumptions: [],
}

const FEAT = {
  name: 'Emberborn', category: 'Origin', prerequisite: 'Fire genasi', repeatable: false,
  description: 'Flame answers you.', snippet: 'Fire resistance.',
  benefits: ['Resistance to fire damage'], abilityScoreIncrease: 'Increase Con by 1.', assumptions: [],
}

describe('D&D Beyond export', () => {
  it('uses the base type branch instead of a Type for weapons', () => {
    const out = toDndBeyondText('item', ITEM)
    expect(out).toContain('Item Base Type: Weapon')
    expect(out).toContain('Base Weapon: Dagger')
    expect(out).not.toMatch(/^Type:/m)
  })

  it('notes that weight and value have nowhere to go', () => {
    // D&D Beyond takes these from the base item, not the homebrew form.
    expect(toDndBeyondText('item', ITEM)).toContain('no weight/value fields')
  })

  it('merges description and properties into the single description box', () => {
    const out = toDndBeyondText('item', ITEM)
    expect(out).toContain('A pale blade.')
    expect(out).toContain('+1 to attack and damage.')
  })

  it('emits concentration as the duration, with interval and unit apart', () => {
    const out = toDndBeyondText('spell', SPELL)
    expect(out).toContain('Duration: Concentration')
    expect(out).toContain('Duration Interval: 1')
    expect(out).toContain('Duration Unit: Minute')
  })

  it('omits spell range unless the spell is ranged', () => {
    expect(toDndBeyondText('spell', SPELL)).not.toMatch(/^Range:/m)
    expect(toDndBeyondText('spell', { ...SPELL, rangeOrigin: 'Ranged', range: '60 feet' }))
      .toContain('Range: 60 feet')
  })

  it('splits monster hit points into the three inputs the form wants', () => {
    const out = toDndBeyondText('monster', MONSTER)
    expect(out).toContain('Average Hit Points: 45')
    expect(out).toContain('Hit Point Die Count: 6')
    expect(out).toContain('Hit Point Die Value: d8')
    expect(out).toContain('Hit Point Modifier: 18')
  })

  it('flattens monster traits and actions into text blocks', () => {
    const out = toDndBeyondText('monster', MONSTER)
    expect(out).toContain('Bog Stride. Moves through water freely.')
    expect(out).toContain('Grasp. 2d8 necrotic.')
  })

  it('folds feat fields the form lacks into the description, and says so', () => {
    const out = toDndBeyondText('feat', FEAT)
    expect(out).toContain('Prerequisite: Fire genasi')
    expect(out).toContain('• Resistance to fire damage')
    expect(out).toContain('no feat category field')
  })

  it('never leaks undefined into any export', () => {
    for (const [type, data] of [['item', ITEM], ['spell', SPELL], ['monster', MONSTER], ['feat', FEAT]]) {
      expect(toDndBeyondText(type, data)).not.toMatch(/undefined|\[object/)
    }
  })
})

describe('Homebrewery markdown', () => {
  it('writes an item subtitle with base item and attunement', () => {
    const out = toHomebreweryMarkdown('item', ITEM)
    expect(out).toContain('#### Frostbite')
    expect(out).toContain('*Weapon (Dagger), rare (requires attunement by a spellcaster)*')
  })

  it('handles a sparse item without emitting empty sections', () => {
    const out = toHomebreweryMarkdown('item', { name: 'Plain', rarity: 'Common', requiresAttunement: false })
    expect(out).toContain('#### Plain')
    expect(out).not.toMatch(/undefined|\[object/)
  })

  it('renders a spell duration as Concentration, up to N', () => {
    expect(toHomebreweryMarkdown('spell', SPELL)).toContain('Concentration, up to 1 Minute')
  })

  it('builds a monster stat block with an ability table and correct modifiers', () => {
    const out = toHomebreweryMarkdown('monster', MONSTER)
    expect(out).toContain('> ## Bog Wraith')
    expect(out).toContain('|STR|DEX|CON|INT|WIS|CHA|')
    expect(out).toContain('8 (-1)')
    expect(out).toContain('16 (+3)')
  })

  it('omits a zero walk speed for a flying creature', () => {
    // Asserting on the whole line: "0 ft." alone would also match "30 ft.".
    const out = toHomebreweryMarkdown('monster', MONSTER)
    expect(out).toContain('**Speed** fly 30 ft., swim 20 ft.')
  })

  it('never leaks undefined into any markdown', () => {
    for (const [type, data] of [['item', ITEM], ['spell', SPELL], ['monster', MONSTER], ['feat', FEAT]]) {
      expect(toHomebreweryMarkdown(type, data)).not.toMatch(/undefined|\[object/)
    }
  })
})
