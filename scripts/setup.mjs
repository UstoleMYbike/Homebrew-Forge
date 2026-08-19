#!/usr/bin/env node
/**
 * Zero-dependency setup helper. Deliberately uses only Node built-ins so it
 * can run before `npm install` has ever happened — the first thing a new DM
 * runs, not the last.
 */
import { spawnSync } from 'node:child_process'
import http from 'node:http'

const OLLAMA_URL = 'http://localhost:11434/api/tags'

function log(msg = '') {
  console.log(msg)
}

function step(msg) {
  console.log(`\n== ${msg} ==`)
}

function checkNode() {
  step('Checking Node.js version')
  const [major] = process.versions.node.split('.').map(Number)
  if (major < 18) {
    log(`Found Node ${process.version}. Homebrew Forge needs Node 18 or newer.`)
    log('Get it from https://nodejs.org, then re-run this script.')
    process.exit(1)
  }
  log(`Node ${process.version} — OK`)
}

function checkOllama() {
  step('Checking for a local Ollama server')
  return new Promise((resolve) => {
    const req = http.get(OLLAMA_URL, { timeout: 2000 }, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          const models = (data.models ?? []).map((m) => m.name)
          if (models.length === 0) {
            log('Ollama is running, but no models are pulled yet.')
            log('Run: ollama pull llama3.1')
          } else {
            log(`Ollama is running with ${models.length} model(s): ${models.join(', ')}`)
          }
          resolve(true)
        } catch {
          resolve(false)
        }
      })
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

function printOllamaInstructions() {
  log('Could not reach Ollama at http://localhost:11434.')
  log('')
  log('1. Install it from https://ollama.com/download')
  log('2. Start it (it usually runs automatically after install)')
  log('3. Pull a model:  ollama pull llama3.1')
  log('')
  log("Then re-run this script, or just open the app — its Settings screen")
  log('checks the same thing before letting you continue.')
}

function installDependencies() {
  step('Installing dependencies')
  // npm ships as npm.cmd on Windows, which only spawns correctly through a
  // shell. Passing the whole command as one string (rather than a command
  // plus an argv array) avoids Node's shell-plus-args escaping warning,
  // since there is nothing here for a shell to misinterpret.
  const result = spawnSync('npm install', { shell: true, stdio: 'inherit' })
  if (result.status !== 0) {
    log('\nnpm install failed — see the error above.')
    process.exit(1)
  }
}

async function main() {
  log('Homebrew Forge setup')

  checkNode()
  const ollamaReady = await checkOllama()
  if (!ollamaReady) printOllamaInstructions()
  installDependencies()

  step('Ready')
  log('Build and start the app with:\n')
  log('  npm run build')
  log('  npm run preview -- --port 4173\n')
  log('Then open http://localhost:4173 in your browser.')
}

main()
