#!/usr/bin/env node
/**
 * Builds the published-artifact version of Homebrew Forge: one self-contained
 * HTML file with the app's CSS and JS inlined. The Artifact tool wraps the file
 * in its own document skeleton, so this writes the page content only (a title,
 * a style block, the mount node and the script), not <html>/<head>/<body>.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = 'dist-artifact'

const build = spawnSync('npx vite build --config vite.artifact.config.js', { shell: true, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)

const html = readFileSync(join(OUT_DIR, 'artifact.html'), 'utf8')

function asset(pattern, kind) {
  const match = html.match(pattern)
  if (!match) throw new Error(`Could not find the built ${kind} in ${OUT_DIR}/artifact.html`)
  return readFileSync(join(OUT_DIR, match[1].replace(/^\//, '')), 'utf8')
}

const js = asset(/<script[^>]*\ssrc="([^"]+\.js)"[^>]*><\/script>/, 'script')
const css = asset(/<link[^>]*\shref="([^"]+\.css)"[^>]*>/, 'stylesheet')

// Neither </script> nor <!-- may appear in an inline script as written.
const safeJs = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')
const safeCss = css.replace(/<\/style/gi, '<\\/style')

const page = `<title>Homebrew Forge</title>
<style>
${safeCss}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`

const target = join(OUT_DIR, 'homebrew-forge.html')
writeFileSync(target, page)
console.log(`\nWrote ${target} (${(statSync(target).size / 1024).toFixed(0)} KB)`)
