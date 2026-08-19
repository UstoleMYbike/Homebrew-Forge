import { useEffect, useState } from 'react'

/**
 * Shows only when Chrome/Edge has offered an install prompt (captured early in
 * index.html). Hidden when already installed or when running standalone.
 */
function InstallButton() {
  const [available, setAvailable] = useState(Boolean(window.__installPrompt))

  useEffect(() => {
    const sync = () => setAvailable(Boolean(window.__installPrompt))
    window.addEventListener('hf-installable', sync)
    sync()
    return () => window.removeEventListener('hf-installable', sync)
  }, [])

  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone

  if (!available || standalone) return null

  async function handleInstall() {
    const prompt = window.__installPrompt
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    // The event can only be used once.
    window.__installPrompt = null
    setAvailable(false)
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="rounded-full border border-purple-400/40 bg-purple-500/15 px-3 py-2 text-xs font-medium text-purple-200"
    >
      Install app
    </button>
  )
}

export default InstallButton
