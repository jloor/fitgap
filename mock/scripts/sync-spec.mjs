#!/usr/bin/env node
/**
 * Copies the canonical OpenAPI definition into the mock app so the app can be
 * deployed with `mock/` as its root directory.
 *
 * The copy is committed deliberately: Vercel builds only see files under the
 * project root, so `../openapi` isn't available at build time.
 *
 * Run with `--check` to verify the copy is in sync without writing. CI uses
 * this so the mock can never silently drift from the spec it claims to serve.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SOURCE = resolve(here, '../../openapi/fitgap.yaml')
const DEST = resolve(here, '../spec/fitgap.yaml')
const check = process.argv.includes('--check')

if (!existsSync(SOURCE)) {
  // Running from a deployment where only mock/ was uploaded: the committed
  // copy is the source of truth and there's nothing to sync.
  if (existsSync(DEST)) {
    console.log('spec: source not present (deploy context) — using committed copy')
    process.exit(0)
  }
  console.error(`spec: neither ${SOURCE} nor ${DEST} exists`)
  process.exit(1)
}

const source = readFileSync(SOURCE, 'utf8')
const current = existsSync(DEST) ? readFileSync(DEST, 'utf8') : null

if (check) {
  if (source !== current) {
    console.error('spec: mock/spec/fitgap.yaml is OUT OF SYNC with openapi/fitgap.yaml')
    console.error('      run `npm run sync-spec` in mock/ and commit the result')
    process.exit(1)
  }
  console.log('spec: in sync')
  process.exit(0)
}

if (source === current) {
  console.log('spec: already in sync')
} else {
  mkdirSync(dirname(DEST), { recursive: true })
  writeFileSync(DEST, source)
  console.log('spec: synced openapi/fitgap.yaml -> mock/spec/fitgap.yaml')
}
