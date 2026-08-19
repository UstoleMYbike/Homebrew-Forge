import { useEffect, useState } from 'react'
import Settings from './screens/Settings'
import Home from './screens/Home'
import Library from './screens/Library'
import EntryPreview from './screens/EntryPreview'
import { getLLMConfig } from './lib/llmConfig'
import { updateEntry } from './lib/library'

function App() {
  const [screen, setScreen] = useState(null) // 'setup' | 'home' | 'library'
  const [openEntry, setOpenEntry] = useState(null)
  const [returnTo, setReturnTo] = useState('home')
  const [autoCheck, setAutoCheck] = useState(false)

  useEffect(() => {
    setScreen(getLLMConfig() ? 'home' : 'setup')
  }, [])

  // autoCheck is only set for freshly generated content — opening an existing
  // library entry shouldn't silently kick off a local inference run.
  function openEntryFrom(entry, from, options = {}) {
    setOpenEntry(entry)
    setReturnTo(from)
    setAutoCheck(Boolean(options.autoCheck))
  }

  // Every committed field edit is persisted, so the library always reflects
  // what the DM sees on the card.
  async function handleEntryChange(data) {
    setOpenEntry((current) => (current ? { ...current, data } : current))
    if (openEntry) await updateEntry(openEntry.id, data)
  }

  if (screen === null) return null

  if (openEntry) {
    return (
      <EntryPreview
        data={openEntry.data}
        contentType={openEntry.contentType}
        autoCheck={autoCheck}
        onChange={handleEntryChange}
        onBack={() => {
          setOpenEntry(null)
          setScreen(returnTo)
        }}
      />
    )
  }

  if (screen === 'setup') {
    return (
      <Settings
        onSaved={() => setScreen('home')}
        onCancel={getLLMConfig() ? () => setScreen('home') : undefined}
      />
    )
  }

  if (screen === 'library') {
    return (
      <Library
        onBack={() => setScreen('home')}
        onOpen={(entry) => openEntryFrom(entry, 'library')}
      />
    )
  }

  return (
    <Home
      onEditSettings={() => setScreen('setup')}
      onOpenLibrary={() => setScreen('library')}
      onGenerated={(entry) => openEntryFrom(entry, 'home', { autoCheck: true })}
    />
  )
}

export default App
