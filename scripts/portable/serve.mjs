/**
 * Static file server for the portable (USB) build.
 *
 * Deliberately zero-dependency and self-contained: it runs against a bundled
 * node.exe on a machine that has never installed Node, npm, or this project,
 * so it cannot import anything that isn't a Node built-in.
 *
 * A plain file:// open won't do — service workers and the PWA install prompt
 * both require an http origin, so the app has to be served even locally.
 */
import { createServer } from 'node:http'
import { createConnection } from 'node:net'
import { readFile, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('./app', import.meta.url)))
const START_PORT = 4173
const MAX_PORT_ATTEMPTS = 20

// Correct types matter more than usual here: a service worker served as the
// wrong MIME type is rejected outright, which silently breaks offline + install.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function contentType(filePath) {
  return MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

/** Resolves a URL path inside ROOT, refusing anything that escapes it. */
function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0])
  const candidate = resolve(join(ROOT, normalize(decoded)))
  if (candidate !== ROOT && !candidate.startsWith(ROOT + '\\') && !candidate.startsWith(ROOT + '/')) {
    return null
  }
  return candidate
}

async function readIfFile(filePath) {
  try {
    const info = await stat(filePath)
    if (!info.isFile()) return null
    return await readFile(filePath)
  } catch {
    return null
  }
}

const server = createServer(async (req, res) => {
  const requested = safePath(req.url === '/' ? '/index.html' : req.url)
  if (!requested) {
    res.writeHead(403).end('Forbidden')
    return
  }

  let body = await readIfFile(requested)
  let filePath = requested

  // Single-page app: unknown paths fall back to index.html so deep links work.
  if (!body) {
    filePath = join(ROOT, 'index.html')
    body = await readIfFile(filePath)
  }
  if (!body) {
    res.writeHead(404).end('Not found — is the app folder missing?')
    return
  }

  res.writeHead(200, {
    'content-type': contentType(filePath),
    // The service worker caches aggressively on its own; letting the browser
    // also cache means a rebuilt stick would keep serving the old app.
    'cache-control': 'no-cache',
  })
  res.end(body)
})

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref()
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
    }
  } catch {
    // Opening a browser is a convenience; the printed URL is the real answer.
  }
}

/**
 * Binding to 127.0.0.1 keeps this off the network, but it also means a bind
 * succeeds even when something else already holds the same port on ::1 —
 * leaving two servers up and "localhost:PORT" resolving to whichever the OS
 * prefers. So probe both stacks and treat either answering as "taken".
 */
function portIsTaken(port, host) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host })
    const done = (taken) => {
      socket.destroy()
      resolve(taken)
    }
    socket.setTimeout(300)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

async function firstFreePort(startPort) {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    const taken = (await portIsTaken(port, '127.0.0.1')) || (await portIsTaken(port, '::1'))
    if (!taken) return port
  }
  return startPort
}

function listen(port, attempt = 0) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
      listen(port + 1, attempt + 1)
      return
    }
    console.error('\nCould not start the server:', err.message)
    process.exit(1)
  })

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`
    console.log('')
    console.log('  Homebrew Forge is running.')
    console.log('')
    console.log(`  ${url}`)
    console.log('')
    console.log('  Your browser should open automatically.')
    console.log('  Leave this window open while you use the app.')
    console.log('  Close it (or press Ctrl+C) when you are done.')
    console.log('')
    openBrowser(url)
  })
}

firstFreePort(START_PORT).then(listen)
