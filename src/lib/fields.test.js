import { describe, expect, it } from 'vitest'
import {
  abilityModifier,
  castingTimeText,
  componentsText,
  durationText,
  formatSpeed,
  higherLevelScalingText,
  hitPointsText,
  joinList,
  rangeText,
  spellLevelText,
  splitList,
} from './fields'

describe('abilityModifier', () => {
  it('matches the 5e table', () => {
    expect(abilityModifier(1)).toBe('-5')
    expect(abilityModifier(8)).toBe('-1')
    expect(abilityModifier(10)).toBe('+0')
    expect(abilityModifier(11)).toBe('+0')
    expect(abilityModifier(16)).toBe('+3')
    expect(abilityModifier(20)).toBe('+5')
  })

  it('degrades gracefully on missing scores', () => {
    expect(abilityModifier(undefined)).toBe('—')
    expect(abilityModifier('abc')).toBe('—')
  })
})

describe('formatSpeed', () => {
  it('lists only the modes a creature has', () => {
    expect(formatSpeed({ walk: 30, fly: null, swim: 20 })).toBe('30 ft., swim 20 ft.')
  })

  it('omits a zero walk speed', () => {
    expect(formatSpeed({ walk: 0, fly: 30 })).toBe('fly 30 ft.')
  })
})

describe('spellLevelText', () => {
  it('calls level 0 a cantrip', () => {
    expect(spellLevelText({ level: 0, school: 'Evocation' })).toBe('Evocation cantrip')
  })

  it('uses ordinals above cantrip', () => {
    expect(spellLevelText({ level: 3, school: 'Evocation' })).toBe('3rd-level Evocation')
  })
})

describe('higherLevelScalingText', () => {
  it('matches the real Fireball convention: the formula once, no per-level breakdown', () => {
    // This is the exact pattern a local model got wrong — inventing
    // character-level breakpoints (5th/11th/17th, which is cantrip scaling)
    // instead of the correct linear-per-slot-level convention.
    const text = higherLevelScalingText({
      level: 3, higherLevelScaling: { dice: '1d6', effect: 'fire damage' },
    })
    expect(text).toBe(
      'When you cast this spell using a spell slot of 4th level or higher, the fire damage increases by 1d6 for each slot level above 3rd.'
    )
  })

  it('works at the lower edge, a 1st-level spell', () => {
    const text = higherLevelScalingText({ level: 1, higherLevelScaling: { dice: '1d8', effect: 'healing' } })
    expect(text).toContain('spell slot of 2nd level or higher')
    expect(text).toContain('above 1st')
  })

  it('works at the upper edge, an 8th-level spell', () => {
    const text = higherLevelScalingText({ level: 8, higherLevelScaling: { dice: '1d6', effect: 'damage' } })
    expect(text).toContain('spell slot of 9th level or higher')
    expect(text).toContain('above 8th')
  })

  it('a 9th-level spell has no higher slot to scale into', () => {
    expect(higherLevelScalingText({ level: 9, higherLevelScaling: { dice: '1d6', effect: 'damage' } })).toBe('')
  })

  it('a cantrip has no spell slot to upcast with', () => {
    expect(higherLevelScalingText({ level: 0, higherLevelScaling: { dice: '1d6', effect: 'damage' } })).toBe('')
  })

  it('falls back to freeform text for a spell that scales some other way', () => {
    expect(higherLevelScalingText({ level: 3, atHigherLevels: 'You may target one additional creature.' }))
      .toBe('You may target one additional creature.')
  })

  it('is empty when neither is set', () => {
    expect(higherLevelScalingText({ level: 3 })).toBe('')
  })
})

describe('durationText', () => {
  it('reads concentration with its interval', () => {
    expect(durationText({ durationType: 'Concentration', durationInterval: 1, durationUnit: 'Minute' }))
      .toBe('Concentration, up to 1 Minute')
  })

  it('pluralises intervals above one', () => {
    expect(durationText({ durationType: 'Time', durationInterval: 10, durationUnit: 'Minute' }))
      .toBe('10 Minutes')
  })

  it('passes through types that take no interval', () => {
    expect(durationText({ durationType: 'Instantaneous' })).toBe('Instantaneous')
  })
})

describe('castingTimeText and rangeText', () => {
  it('renders a plain action without a leading number', () => {
    expect(castingTimeText({ castingTimeValue: 1, activation: 'Action' })).toBe('Action')
  })

  it('renders unit-style activations with their count', () => {
    expect(castingTimeText({ castingTimeValue: 10, activation: 'Minute' })).toBe('10 Minutes')
  })

  it('appends a reaction trigger', () => {
    expect(castingTimeText({ activation: 'Reaction', castingTimeDescription: 'when you are hit' }))
      .toBe('Reaction, when you are hit')
  })

  it('shows the distance only for ranged spells', () => {
    expect(rangeText({ rangeOrigin: 'Self', range: '60 feet' })).toBe('Self')
    expect(rangeText({ rangeOrigin: 'Ranged', range: '60 feet' })).toBe('60 feet')
  })
})

describe('componentsText', () => {
  it('lists the flags and the material in parentheses', () => {
    expect(componentsText({ verbal: true, somatic: true, material: true, materialDescription: 'soot' }))
      .toBe('V, S, M (soot)')
  })

  it('omits absent components', () => {
    expect(componentsText({ verbal: false, somatic: true, material: false })).toBe('S')
  })
})

describe('hitPointsText', () => {
  it('renders average with the dice expression', () => {
    expect(hitPointsText({ averageHitPoints: 45, hitPointDieCount: 6, hitPointDieValue: 'd8', hitPointModifier: 18 }))
      .toBe('45 (6d8 + 18)')
  })

  it('handles a negative modifier', () => {
    expect(hitPointsText({ averageHitPoints: 9, hitPointDieCount: 3, hitPointDieValue: 'd6', hitPointModifier: -3 }))
      .toBe('9 (3d6 - 3)')
  })

  it('falls back to the average alone when dice are missing', () => {
    expect(hitPointsText({ averageHitPoints: 45 })).toBe('45')
  })
})

describe('list helpers', () => {
  it('round-trips a comma separated list', () => {
    expect(splitList(joinList(['Wizard', 'Sorcerer']))).toEqual(['Wizard', 'Sorcerer'])
  })

  it('drops blanks and trims', () => {
    expect(splitList(' Wizard , , Sorcerer ')).toEqual(['Wizard', 'Sorcerer'])
  })
})
