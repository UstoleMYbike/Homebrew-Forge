import { describe, expect, it } from 'vitest'
import { RawOutputError, parseJsonResponse, parseTextResponse } from './llm'

// The safety net exists because local models are unreliable at strict JSON.
// These are the shapes llama3.1 actually produced during development.
describe('parseJsonResponse', () => {
  it('parses clean JSON', () => {
    expect(parseJsonResponse('{"name":"A"}').name).toBe('A')
  })

  it('strips ```json fences', () => {
    expect(parseJsonResponse('```json\n{"name":"A"}\n```').name).toBe('A')
  })

  it('strips bare fences', () => {
    expect(parseJsonResponse('```\n{"name":"A"}\n```').name).toBe('A')
  })

  it('extracts JSON preceded by prose', () => {
    expect(parseJsonResponse('Sure! Here you go:\n{"name":"A"}').name).toBe('A')
  })

  it('extracts JSON with prose on both sides', () => {
    expect(parseJsonResponse('Here:\n{"name":"A"}\nHope that helps!').name).toBe('A')
  })

  it('handles nested objects when extracting', () => {
    expect(parseJsonResponse('x {"name":"A","s":{"walk":30}} y').name).toBe('A')
  })

  it('is not confused by braces inside strings', () => {
    expect(parseJsonResponse('{"name":"} A"}').name).toBe('} A')
  })

  it('is not confused by escaped quotes', () => {
    expect(parseJsonResponse('{"name":"\\" A"}').name).toBe('" A')
  })

  it('throws RawOutputError carrying the raw text when there is no JSON', () => {
    const junk = 'I cannot generate that, sorry.'
    expect(() => parseJsonResponse(junk)).toThrow(RawOutputError)
    try {
      parseJsonResponse(junk)
    } catch (err) {
      expect(err.raw).toBe(junk)
    }
  })

  it('throws RawOutputError on truncated output', () => {
    // Hitting the token limit mid-object leaves no balanced block.
    expect(() => parseJsonResponse('{"name":"A","d":"trunc')).toThrow(RawOutputError)
  })
})

describe('parseTextResponse', () => {
  it('strips fences from prose responses', () => {
    expect(parseTextResponse('```\nFrostbite\n```')).toBe('Frostbite')
  })
})
