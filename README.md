# Homebrew Forge

A mobile-first PWA that generates D&D 5e homebrew — magic items, spells, monsters
and feats — from a freeform description, using a **local LLM**. No cloud API, no
API key, no backend, no accounts. Everything runs on your own machine.

## Requirements

A local LLM server, running before you open the app:

- **Ollama** (default, `http://localhost:11434`) — install from ollama.com, then
  `ollama pull llama3.1`
- or any **OpenAI-compatible** server (LM Studio, llama.cpp) at
  `http://localhost:1234/v1` — switch to it in Settings

Ollama must allow the app's origin. If the connection test fails, start it with
`OLLAMA_ORIGINS=*`.

## Running it

```bash
npm install
npm run dev                                        # development, localhost:5173
npm run build && npm run preview -- --port 4173    # production build
npm test                                           # unit tests
```

The installed desktop PWA points at whatever origin you installed it from, so the
preview server has to be running for it to work.

## How it works

1. **Settings** — pick server type, enter the URL, and press *Test Connection*.
   This pings the server *and* sends a real prompt to confirm the model responds;
   you can't proceed until it does. Config lives in `localStorage`.
2. **Home** — pick a content type, describe what you want, hit Generate.
3. **Preview card** — every field is tap-to-edit. A balance check runs
   automatically in the background and shows any flags as a dismissible badge.
4. **Iterate** — Weaker / Stronger / Reroll flavor / Change tier. Keeps exactly
   one prior version for undo.
5. **Export** — *Copy for D&D Beyond* (field-by-field, in the real form order),
   *Copy as Markdown* (Homebrewery), or *Export as PDF* (via the print dialog).
6. **Library** — everything generated is saved to IndexedDB, searchable and
   filterable by type, with edit / duplicate / delete.

## Layout

```
src/
  lib/
    schemas.js     JSON schemas + D&D Beyond enums; the source of truth for shape
    prompts.js     system prompts, one per operation
    llm.js         provider-agnostic calls + the JSON parsing safety net
    providers.js   Ollama and OpenAI-compatible adapters
    normalize.js   strips inapplicable fields, migrates older entry shapes
    library.js     IndexedDB store
    exporters.js   D&D Beyond and Homebrewery formatting
    fields.js      shared display helpers
  components/cards/  one preview card per content type
  screens/           Settings, Home, EntryPreview, Library
```

### The parsing safety net

Local models are unreliable at strict JSON, so every response goes through:
strip markdown fences → parse → extract the first brace-balanced `{...}` → parse
again → failing that, show the DM the raw output with a *Regenerate* button
rather than crashing.

### Schemas follow D&D Beyond

Field names, shapes and enums were read off the actual Homebrew Creator forms, so
generated content pastes in without reshaping. Notable consequences:

- An item has a **base type** (Item/Armor/Weapon) *and*, for plain items, a
  closed **Type** list. There are no weight or value fields on D&D Beyond.
- **Concentration is a duration type**, not a boolean.
- Monster hit points split into average + die count + die value + modifier.
- The feat form is only name/description/snippet/tags; everything else is
  app-only and gets folded into the description on export.

`normalize.js` enforces this on parse, and migrates older entries on read.

## Gotchas

- **After a rebuild, reload the installed app twice.** The service worker serves
  the previous version on the first load and picks up the new one on the second.
- The installed app and a browser tab on the same origin **share** the library
  and the service worker.
- Generation takes 30–60s on a local 8B model. That's the model, not the app.

## Not done yet

- Phone install needs an HTTPS host; Chrome on Android won't install over plain
  HTTP, and `localhost` is the only exception.
- The naming and rarity/level/CR-suggestion prompts are written but not wired to
  any UI.
- The D&D Beyond export has never been pasted into the real form end to end.
  The field names and order were read off the live Creator pages, but no
  generated entry has actually been saved there.
- Tests cover the pure logic (parsing, normalization, exporters, field
  helpers). The React components and the IndexedDB layer are untested.
