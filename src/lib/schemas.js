// JSON schemas for the four generators. Field names, shapes and enum values
// below were read directly off D&D Beyond's Homebrew Creator forms
// (/homebrew/creations/create-*/create) so generated content drops into that
// form without reshaping. Fields marked "app-only" have no home on D&D Beyond
// but are kept because they're useful at the table and in Markdown export.

export const DDB_RARITIES = [
  'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact', 'Varies', 'Unknown Rarity',
]

/** D&D Beyond's closed "Type" list, used only when itemBaseType is "Item". */
export const DDB_ITEM_TYPES = ['Wondrous Item', 'Rod', 'Scroll', 'Staff', 'Wand', 'Ring', 'Potion']

export const DDB_SCHOOLS = [
  'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
  'Evocation', 'Illusion', 'Necromancy', 'Transmutation',
]

export const DDB_ACTIVATIONS = ['Action', 'Bonus Action', 'Reaction', 'Minute', 'Hour', 'No Action', 'Special']
export const DDB_RANGE_ORIGINS = ['Self', 'Touch', 'Ranged', 'Sight', 'Unlimited']
export const DDB_DURATION_TYPES = [
  'Concentration', 'Instantaneous', 'Special', 'Time', 'Until Dispelled', 'Until Dispelled or Triggered',
]
export const DDB_DURATION_UNITS = ['Round', 'Minute', 'Hour', 'Day']

export const DDB_MONSTER_TYPES = [
  'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 'Fey', 'Fiend',
  'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead',
]
export const DDB_SIZES = ['Tiny', 'Small', 'Medium', 'Medium or Small', 'Large', 'Huge', 'Gargantuan']
export const DDB_HIT_DIE_VALUES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20']
export const DDB_CHALLENGE_RATINGS = [
  '0', '1/8', '1/4', '1/2',
  ...Array.from({ length: 30 }, (_, i) => String(i + 1)),
]

export const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    // D&D Beyond splits the type in two: a base type, then a closed list that
    // only applies to plain items.
    itemBaseType: { type: 'string', enum: ['Item', 'Armor', 'Weapon'] },
    itemType: {
      type: ['string', 'null'],
      enum: [...DDB_ITEM_TYPES, null],
      description: 'Required when itemBaseType is "Item"; null otherwise.',
    },
    baseArmor: {
      type: ['string', 'null'],
      description: 'e.g. "Leather", "Plate", "Shield" — only when itemBaseType is "Armor".',
    },
    baseWeapon: {
      type: ['string', 'null'],
      description: 'e.g. "Dagger", "Longsword" — only when itemBaseType is "Weapon".',
    },
    rarity: { type: 'string', enum: DDB_RARITIES },
    requiresAttunement: { type: 'boolean' },
    attunementRequirement: {
      type: ['string', 'null'],
      description: 'e.g. "by a spellcaster" — null if attunement is unrestricted.',
    },
    description: { type: 'string', description: 'Flavor text' },
    properties: {
      type: 'string',
      description: 'Mechanical rules text. Merged with description on D&D Beyond, which has one box.',
    },
    weight: { type: ['string', 'null'], description: 'app-only' },
    value: { type: ['string', 'null'], description: 'app-only' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'name', 'itemBaseType', 'itemType', 'rarity', 'requiresAttunement',
    'description', 'properties', 'assumptions',
  ],
}

export const SPELL_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    level: { type: 'integer', minimum: 0, maximum: 9, description: '0 = cantrip' },
    school: { type: 'string', enum: DDB_SCHOOLS },
    // Casting time is a number plus a unit, not one string.
    castingTimeValue: { type: 'integer', minimum: 0 },
    activation: { type: 'string', enum: DDB_ACTIVATIONS },
    castingTimeDescription: {
      type: ['string', 'null'],
      description: 'Reaction trigger, or other qualifier. Null if none.',
    },
    rangeOrigin: { type: 'string', enum: DDB_RANGE_ORIGINS },
    range: {
      type: ['string', 'null'],
      description: 'Distance when rangeOrigin is "Ranged", e.g. "60 feet". Null otherwise.',
    },
    components: {
      type: 'object',
      properties: {
        verbal: { type: 'boolean' },
        somatic: { type: 'boolean' },
        material: { type: 'boolean' },
        materialDescription: { type: ['string', 'null'] },
      },
      required: ['verbal', 'somatic', 'material', 'materialDescription'],
    },
    // Concentration is a duration TYPE on D&D Beyond, not a separate flag.
    durationType: { type: 'string', enum: DDB_DURATION_TYPES },
    durationInterval: {
      type: ['integer', 'null'],
      description: 'Number paired with durationUnit, e.g. 1 in "1 minute". Null when instantaneous.',
    },
    durationUnit: { type: ['string', 'null'], enum: [...DDB_DURATION_UNITS, null] },
    ritual: { type: 'boolean' },
    canCastAtHigherLevel: { type: 'boolean' },
    atHigherLevels: { type: ['string', 'null'] },
    classes: { type: 'array', items: { type: 'string' } },
    description: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'name', 'level', 'school', 'castingTimeValue', 'activation', 'rangeOrigin',
    'components', 'durationType', 'ritual', 'canCastAtHigherLevel', 'classes',
    'description', 'assumptions',
  ],
}

const namedBlock = {
  type: 'array',
  items: {
    type: 'object',
    properties: { name: { type: 'string' }, description: { type: 'string' } },
    required: ['name', 'description'],
  },
}

export const MONSTER_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    size: { type: 'string', enum: DDB_SIZES },
    creatureType: { type: 'string', enum: DDB_MONSTER_TYPES },
    subType: { type: ['string', 'null'], description: 'e.g. "goblinoid". Null if none.' },
    alignment: {
      type: 'string',
      description: 'e.g. "Chaotic Evil", "Any Alignment", "Unaligned".',
    },
    challengeRating: { type: 'string', enum: DDB_CHALLENGE_RATINGS },
    armorClass: { type: 'integer' },
    armorClassType: { type: ['string', 'null'], description: 'e.g. "natural armor"' },
    averageHitPoints: { type: 'integer' },
    // D&D Beyond takes hit dice as three separate inputs.
    hitPointDieCount: { type: 'integer' },
    hitPointDieValue: { type: 'string', enum: DDB_HIT_DIE_VALUES },
    hitPointModifier: { type: 'integer' },
    speed: {
      type: 'object',
      properties: {
        walk: { type: 'integer' },
        fly: { type: ['integer', 'null'] },
        swim: { type: ['integer', 'null'] },
        climb: { type: ['integer', 'null'] },
        burrow: { type: ['integer', 'null'] },
      },
      required: ['walk', 'fly', 'swim', 'climb', 'burrow'],
    },
    abilityScores: {
      type: 'object',
      properties: {
        str: { type: 'integer' }, dex: { type: 'integer' }, con: { type: 'integer' },
        int: { type: 'integer' }, wis: { type: 'integer' }, cha: { type: 'integer' },
      },
      required: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
    },
    savingThrows: { type: ['array', 'null'], items: { type: 'string' } },
    skills: { type: ['array', 'null'], items: { type: 'string' } },
    damageResistances: { type: ['array', 'null'], items: { type: 'string' } },
    damageImmunities: { type: ['array', 'null'], items: { type: 'string' } },
    conditionImmunities: { type: ['array', 'null'], items: { type: 'string' } },
    senses: { type: 'string' },
    passivePerception: { type: ['integer', 'null'] },
    languages: { type: 'string' },
    // These are free-text blocks on D&D Beyond; kept structured here so the
    // stat block can render them, then joined on export.
    traits: namedBlock,
    actions: namedBlock,
    bonusActions: { ...namedBlock, type: ['array', 'null'] },
    reactions: { ...namedBlock, type: ['array', 'null'] },
    legendaryActions: { ...namedBlock, type: ['array', 'null'] },
    description: { type: 'string', description: 'Maps to Characteristics on D&D Beyond.' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'name', 'size', 'creatureType', 'alignment', 'challengeRating', 'armorClass',
    'averageHitPoints', 'hitPointDieCount', 'hitPointDieValue', 'hitPointModifier',
    'speed', 'abilityScores', 'senses', 'languages', 'traits', 'actions',
    'description', 'assumptions',
  ],
}

export const FEAT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    // D&D Beyond's feat form is just name + description + snippet + tags, so
    // everything below except description/snippet is app-only and gets folded
    // into the description on export.
    description: { type: 'string', description: 'Flavor text' },
    snippet: {
      type: 'string',
      description: 'One-line summary shown on character sheets.',
    },
    prerequisite: { type: ['string', 'null'], description: 'app-only' },
    category: {
      type: ['string', 'null'],
      enum: ['Origin', 'General', 'Fighting Style', 'Epic Boon', null],
      description: 'app-only — 2024 PHB category',
    },
    repeatable: { type: 'boolean', description: 'app-only' },
    benefits: { type: 'array', items: { type: 'string' }, description: 'app-only' },
    abilityScoreIncrease: { type: ['string', 'null'], description: 'app-only' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'description', 'snippet', 'benefits', 'assumptions'],
}

/**
 * What "tier" means per content type, for the iteration row's
 * "change tier to X" adjustment. Feats have no tier, hence null.
 */
export const TIER_OPTIONS = {
  item: { label: 'Rarity', inlineLabel: 'rarity', field: 'rarity', options: DDB_RARITIES.slice(0, 6) },
  spell: {
    label: 'Level',
    inlineLabel: 'level',
    field: 'level',
    options: ['cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'],
  },
  monster: {
    label: 'CR',
    inlineLabel: 'CR', // stays uppercase mid-sentence
    field: 'challengeRating',
    options: ['0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '8', '10', '13', '17', '20'],
  },
  feat: null,
}

/**
 * The schema asks for an array, but a local model may still hand back a bare
 * string — normalize so consumers can always treat it as a list.
 */
export function normalizeAssumptions(assumptions) {
  if (Array.isArray(assumptions)) return assumptions.filter(Boolean)
  return assumptions ? [assumptions] : []
}

// `label` is what the DM sees on a button; `promptLabel` is what gets
// substituted for "[content type]" inside the prompts, where a singular
// natural phrase reads better than the UI label.
export const CONTENT_TYPES = {
  item: { label: 'Magic Item', promptLabel: 'magic item', icon: '💍', schema: ITEM_SCHEMA },
  spell: { label: 'Spell', promptLabel: 'spell', icon: '✨', schema: SPELL_SCHEMA },
  monster: { label: 'Monster', promptLabel: 'monster stat block', icon: '🐉', schema: MONSTER_SCHEMA },
  feat: { label: 'Feat', promptLabel: 'feat', icon: '⭐', schema: FEAT_SCHEMA },
}
