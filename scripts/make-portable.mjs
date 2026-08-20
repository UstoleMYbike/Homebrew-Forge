#!/usr/bin/env node
/**
 * Assembles a self-contained folder to copy onto a USB drive.
 *
 * The result runs on a Windows PC that has never installed Node, npm, or this
 * project — it carries its own node.exe. The one thing it cannot carry is
 * Ollama, which is a multi-gigabyte install with a background service and has
 * to be installed per-machine.
 *
 * Run with:  npm run make-portable
 */
import { spawnSync } from 'node:child_process'
import { cp, mkdir, rm, writeFile, stat, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'portable-build', 'Homebrew Forge')

function step(msg) {
  console.log(`\n== ${msg} ==`)
}

async function dirSizeMb(dir) {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    total += entry.isDirectory() ? (await dirSizeMb(full)) * 1024 * 1024 : (await stat(full)).size
  }
  return total / 1024 / 1024
}

const LAUNCHER = `@echo off
title Homebrew Forge
cd /d "%~dp0"

if not exist "node.exe" (
  echo Could not find node.exe next to this file.
  echo Copy the whole "Homebrew Forge" folder, not just the shortcut.
  pause
  exit /b 1
)

node.exe serve.mjs
echo.
echo The server has stopped.
pause
`

const READ_ME = `HOMEBREW FORGE - portable edition
=================================

A D&D 5e homebrew generator (magic items, spells, monsters, feats) that runs
entirely on your own computer. Nothing is sent to the internet, there is no
account, and there is no subscription.


BEFORE YOU START - install Ollama (one time, ~5 minutes)
--------------------------------------------------------
This app needs a local AI model to generate anything. That part is too large to
fit on a USB stick, so you install it yourself - it is free.

  1. Go to:  https://ollama.com/download
  2. Download and install it (it starts automatically after installing).
  3. Open Command Prompt and run:

       ollama pull llama3.1

     That downloads the AI model - about 5 GB, so it takes a while. You only
     ever do this once.


RUNNING THE APP
---------------
  Double-click:  Start Homebrew Forge.bat

A black window opens (leave it open) and your browser loads the app. The first
screen checks it can reach Ollama - press "Test Connection", then Save.

When you are finished, close the black window.


RUNNING IT WITHOUT THE USB STICK
--------------------------------
Copy this entire "Homebrew Forge" folder to your computer first - your
Documents folder is fine - and run it from there. Then the stick is not needed.

This matters if you use your browser's "Install app" button: the installed app
still needs this server running, so if it lives on the stick, it only works
while the stick is plugged in and the black window is open.


YOUR SAVED HOMEBREW
-------------------
Everything you generate is saved in your browser on this computer, not on the
stick. Use the Export button in the Library screen to save it to a file you can
back up, move to another computer, or hand to another DM (they load it with the
Import button next to it).


TROUBLESHOOTING
---------------
"Could not reach a local LLM server"
    Ollama is not running. Open Command Prompt and run:  ollama serve

"Connected, but no models are pulled yet"
    Run:  ollama pull llama3.1

Windows SmartScreen warning when double-clicking the .bat
    This is normal for files from a USB stick. Choose "More info" then
    "Run anyway". The file is a plain text script - open it in Notepad if you
    want to read exactly what it does first.

Generation feels slow
    30-60 seconds is normal on an average computer. The AI model is running on
    your own hardware rather than a datacentre.


Source code and updates:  https://github.com/UstoleMYbike/Homebrew-Forge
Licensed MIT - free to use, share, and modify.
`

async function main() {
  step('Building the app')
  const build = spawnSync('npm run build', { cwd: ROOT, shell: true, stdio: 'inherit' })
  if (build.status !== 0) {
    console.error('Build failed — aborting.')
    process.exit(1)
  }

  step('Assembling the portable folder')
  await rm(join(ROOT, 'portable-build'), { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  // The built app itself.
  await cp(join(ROOT, 'dist'), join(OUT, 'app'), { recursive: true })

  // A standalone Node runtime, so the target PC needs nothing installed.
  // node.exe runs fine on its own, away from its install directory.
  const nodeExe = process.execPath
  await cp(nodeExe, join(OUT, 'node.exe'))

  await cp(join(ROOT, 'scripts', 'portable', 'serve.mjs'), join(OUT, 'serve.mjs'))
  await writeFile(join(OUT, 'Start Homebrew Forge.bat'), LAUNCHER, 'utf8')
  await writeFile(join(OUT, 'READ ME FIRST.txt'), READ_ME, 'utf8')
  await cp(join(ROOT, 'LICENSE'), join(OUT, 'LICENSE.txt'))

  const size = await dirSizeMb(OUT)

  step('Done')
  console.log(`Folder:  ${OUT}`)
  console.log(`Size:    ${size.toFixed(0)} MB (mostly the bundled Node runtime)`)
  console.log('')
  console.log('Copy the "Homebrew Forge" folder onto a USB drive.')
  console.log('The person receiving it double-clicks "Start Homebrew Forge.bat".')
  console.log('They still need to install Ollama — "READ ME FIRST.txt" walks them through it.')
}

main()
