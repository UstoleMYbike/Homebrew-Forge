import { afterEach, describe, expect, it, vi } from 'vitest'
import { LLMError } from './providers'
import { askClaude, saveFile, toLLMError } from './claudeSample'

function withClaude(capabilities) {
  globalThis.window = { claude: { use: vi.fn(async (name) => capabilities[name] ?? null) } }
}

afterEach(() => {
  delete globalThis.window
})

describe('toLLMError', () => {
  it('maps a declined grant to copy that says what to do', () => {
    const err = toLLMError({ code: 'not_granted', message: 'dev text' })
    expect(err).toBeInstanceOf(LLMError)
    expect(err.message).toMatch(/Allow/)
    expect(err.message).not.toMatch(/dev text/)
  })

  it('maps a usage limit', () => {
    expect(toLLMError({ code: 'rate_limited' }).message).toMatch(/usage limit/)
  })

  it('treats an unknown code as a transient connection problem', () => {
    expect(toLLMError({ code: 'something_new' }).message).toMatch(/connection problem/)
  })

  it('passes an existing LLMError through untouched', () => {
    const original = new LLMError('already friendly')
    expect(toLLMError(original)).toBe(original)
  })
})

describe('askClaude', () => {
  it('sends the instructions and the input together, since sample has no system prompt', async () => {
    const sample = vi.fn(async () => ({ text: '{"name":"X"}' }))
    withClaude({ sample })
    await askClaude({ system: 'RULES', prompt: 'A frost dagger' })
    const [input] = sample.mock.calls[0]
    expect(input).toContain('RULES')
    expect(input).toContain('A frost dagger')
    expect(input.indexOf('RULES')).toBeLessThan(input.indexOf('A frost dagger'))
  })

  it('never caches by default, so Regenerate and Reroll really ask again', async () => {
    const sample = vi.fn(async () => ({ text: 'ok' }))
    withClaude({ sample })
    await askClaude({ system: 's', prompt: 'p' })
    expect(sample.mock.calls[0][1].cache).toBe(false)
  })

  it('lets a caller opt in to the platform cache', async () => {
    const sample = vi.fn(async () => ({ text: 'ok' }))
    withClaude({ sample })
    await askClaude({ system: 's', prompt: 'p', cache: true })
    expect(sample.mock.calls[0][1].cache).toBe(true)
  })

  it('says so plainly when the page is open outside Claude', async () => {
    withClaude({})
    await expect(askClaude({ system: 's', prompt: 'p' })).rejects.toThrow(/inside Claude/)
  })

  it('still reports a missing window.claude as unavailable rather than crashing', async () => {
    await expect(askClaude({ system: 's', prompt: 'p' })).rejects.toThrow(/not available/)
  })

  it('converts a rejection from sample into an LLMError', async () => {
    withClaude({ sample: vi.fn(async () => { throw { code: 'rate_limited', message: 'x' } }) })
    await expect(askClaude({ system: 's', prompt: 'p' })).rejects.toBeInstanceOf(LLMError)
  })
})

describe('saveFile', () => {
  it('resolves null when the viewer declines, which is not an error', async () => {
    withClaude({ downloads: { save: vi.fn(async () => { throw { code: 'declined' } }) } })
    await expect(saveFile('a.md', 'text')).resolves.toBeNull()
  })

  it('hands the filename and contents to the viewer', async () => {
    const save = vi.fn(async () => ({ status: 'saved' }))
    withClaude({ downloads: { save } })
    await saveFile('thing.md', 'hello')
    expect(save).toHaveBeenCalledWith({ filename: 'thing.md', data: 'hello' })
  })

  it('points at the copy buttons when saving is unavailable', async () => {
    withClaude({})
    await expect(saveFile('a.md', 'x')).rejects.toThrow(/copy buttons/)
  })
})
