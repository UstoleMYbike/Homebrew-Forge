# Homebrew Forge

A mobile-first PWA that generates D&D 5e homebrew — magic items, spells, monsters
and feats — from a freeform description, using a **local LLM**. No cloud API, no
API key, no backend, no accounts. Everything runs on your own machine, so your
homebrew and your campaign notes never leave it.

This is a generic tool, not tied to any one campaign — if you're a DM who found
this repo, it works the same way for your table as it does for anyone else's.

## Getting started

You'll need [Node.js](https://nodejs.org) (18+) and [Ollama](https://ollama.com)
installed first. Then:

```bash
git clone https://github.com/UstoleMYbike/Homebrew-Forge.git
cd Homebrew-Forge
npm run setup
```

`npm run setup` checks that Ollama is reachable, tells you what to do if it isn't
(and prints the exact command to pull a model if you don't have one yet), and
installs the app's dependencies. It's safe to run more than once.

Then:

```bash
npm run build
npm run preview -- --port 4173
```

Open `http://localhost:4173`. On the first launch you'll land on a Settings screen
that walks you through connecting to your local model — nothing else is needed.

To install it as an app on your phone or desktop instead of just a browser tab, use
your browser's "Install app" prompt once it's running (Chrome/Edge show one
automatically; on Android this needs an HTTPS host, since Chrome won't install a
plain-HTTP page except on `localhost`).

## Handing it to another DM on a USB drive

```bash
npm run make-portable
```

Produces `portable-build/Homebrew Forge/` — copy that folder onto a USB drive.
Whoever receives it double-clicks **Start Homebrew Forge.bat**; a browser opens
and the app runs. Their PC needs **no Node, no npm, and no copy of this repo** —
the folder carries its own `node.exe` and a small zero-dependency static server.

It's about 90 MB, almost entirely the bundled Node runtime.

The one thing it can't carry is **Ollama** — that's a multi-gigabyte install with
a background service, so each DM installs it themselves. The included
`READ ME FIRST.txt` walks a non-technical DM through that in plain language.

Note the app is served rather than opened as a file on purpose: service workers
and the PWA install prompt both require an http origin, so `file://` won't do.

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
npm run setup                                      # first time only — see above
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
   A reroll button beside the name suggests an alternate one from the same
   description; a "Suggest rarity/level/CR" control proposes a tier with its
   reasoning, and only offers to apply it when the suggestion is one the schema
   actually accepts.
4. **Iterate** — Weaker / Stronger / Reroll flavor / Change tier. Keeps exactly
   one prior version for undo.
5. **Export** — *Copy for D&D Beyond* (field-by-field, in the real form order —
   tested end to end by actually saving a generated item there), *Copy as
   Markdown* (Homebrewery), or *Export as PDF* (via the print dialog).
6. **Library** — everything generated is saved to IndexedDB, searchable and
   filterable by type, with edit / duplicate / delete. **Export / Import** buttons
   in the header move your whole library to a JSON file and back — for backing
   up, moving to another computer, or handing a set of homebrew to another DM.
   Re-importing the same file is safe; it updates existing entries by id rather
   than duplicating them.

## Layout

```
scripts/
  setup.mjs           checks Ollama, installs dependencies — the first thing to run
  make-portable.mjs   assembles the self-contained USB folder
  portable/serve.mjs  zero-dependency static server used by the USB build
src/
  lib/
    schemas.js     JSON schemas + D&D Beyond enums; the source of truth for shape
    prompts.js     system prompts, one per operation
    llm.js         provider-agnostic calls + the JSON parsing safety net
    providers.js   Ollama and OpenAI-compatible adapters
    normalize.js   strips inapplicable fields, migrates older entry shapes
    library.js     IndexedDB store + export/import
    exporters.js   D&D Beyond and Homebrewery formatting
    fields.js      shared display helpers
  components/
    AssistControls.jsx  reroll-name and suggest-tier controls
    cards/              one preview card per content type
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
- Tests cover the pure logic (parsing, normalization, exporters, field helpers,
  library import validation). The React components and the actual IndexedDB
  read/write calls are untested — they'd need a DOM and a fake IndexedDB
  respectively.
- Only D&D 5e is supported. The schemas, prompts, and D&D Beyond export are all
  specific to it; adapting this to another system would mean rewriting those,
  not just reconfiguring something.

## License

MIT — see `LICENSE`. Use it, fork it, adapt it for your own table.
