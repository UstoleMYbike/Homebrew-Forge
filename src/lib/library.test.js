import { describe, expect, it } from 'vitest'
import { parseLibraryExport } from './library'

const VALID_ENTRY = { id: 'a', contentType: 'item', data: { name: 'Frostbite' } }

describe('parseLibraryExport', () => {
  it('reads entries from a real export file', () => {
    const file = { app: 'homebrew-forge', exportVersion: 1, entries: [VALID_ENTRY] }
    const { entries, skipped } = parseLibraryExport(file)
    expect(entries).toEqual([VALID_ENTRY])
    expect(skipped).toBe(0)
  })

  it('also accepts a bare array, for a hand-built file', () => {
    const { entries } = parseLibraryExport([VALID_ENTRY])
    expect(entries).toEqual([VALID_ENTRY])
  })

  it('skips rows with an unknown content type rather than failing the whole import', () => {
    const file = { entries: [VALID_ENTRY, { contentType: 'trap', data: {} }] }
    const { entries, skipped } = parseLibraryExport(file)
    expect(entries).toEqual([VALID_ENTRY])
    expect(skipped).toBe(1)
  })

  it('skips rows with no data', () => {
    const { skipped } = parseLibraryExport({ entries: [{ contentType: 'item' }] })
    expect(skipped).toBe(1)
  })

  it('throws on something that is not an export at all', () => {
    expect(() => parseLibraryExport({ hello: 'world' })).toThrow(/not a Homebrew Forge/)
    expect(() => parseLibraryExport(null)).toThrow(/not a Homebrew Forge/)
    expect(() => parseLibraryExport('just a string')).toThrow(/not a Homebrew Forge/)
  })
})
