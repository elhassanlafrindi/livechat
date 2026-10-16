import { build } from 'esbuild'
import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const output = new URL('./dist/widget.js', import.meta.url)
const backendCopy = new URL('../backEnd/src/main/resources/static/widget.js', import.meta.url)

await build({
  absWorkingDir: root,
  entryPoints: ['src/widget.js'],
  outfile: 'dist/widget.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2018',
  loader: { '.css': 'text' },
})

mkdirSync(dirname(fileURLToPath(backendCopy)), { recursive: true })
copyFileSync(output, backendCopy)
const bytes = statSync(output).size
console.log(`Built widget.js: ${bytes} bytes (${(bytes / 1024).toFixed(1)} KB).`)
console.log('Copied to backEnd/src/main/resources/static/widget.js.')
