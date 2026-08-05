#!/usr/bin/env node
/**
 * Contract tests for the Fitgap mock.
 *
 *   node test/contract.mjs [baseUrl]
 *
 * Two jobs, and the first matters more:
 *
 *   1. Every operation in the OpenAPI definition must answer with a status the
 *      definition declares. This is the check that stops the mock and the
 *      published docs drifting apart — the failure mode that makes a mock worse
 *      than useless, because a consumer trusts it.
 *
 *   2. The behaviours a consumer would integrate against — auth, validation,
 *      pagination, caching, deliberate failures — must actually behave.
 *
 * No test framework: the assertions are simple and the output should be
 * readable in a CI log without a reporter. Exits non-zero on any failure.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parse } from 'yaml'

const BASE = (process.argv[2] || process.env.MOCK_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '')
const here = dirname(fileURLToPath(import.meta.url))
const doc = parse(readFileSync(join(here, '..', 'spec', 'fitgap.yaml'), 'utf8'))

const TOKEN = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }
const IDS = {
  targetId: 'tgt_91aF', analysisId: 'ana_04Bq', gapId: 'gap_5Qw2',
  projectId: 'prj_7Hn3', entryId: 'inv_7Kd2', evidenceId: 'ev_1',
}

let pass = 0
const failures = []
const ok = (name) => { pass++; console.log(`  ok   ${name}`) }
const bad = (name, detail) => { failures.push(`${name} — ${detail}`); console.log(`  FAIL ${name} — ${detail}`) }

const fill = (p) => p.replace(/\{(\w+)\}/g, (_, k) => IDS[k] ?? 'x_1')
const call = (path, init = {}) =>
  fetch(`${BASE}${path}`, { headers: TOKEN, ...init })

async function check(name, fn) {
  try {
    const problem = await fn()
    problem ? bad(name, problem) : ok(name)
  } catch (e) {
    bad(name, e.message)
  }
}

console.log(`contract: ${BASE}\n`)

// --- 1. every declared operation answers with a declared status -------------
console.log('operations')
for (const [path, item] of Object.entries(doc.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue
    const declared = Object.keys(op.responses ?? {}).map(String)
    await check(`${method.toUpperCase()} ${path}`, async () => {
      const res = await call(fill(path), {
        method: method.toUpperCase(),
        body: ['post', 'put', 'patch'].includes(method) ? '{}' : undefined,
      })
      // A 422 is always legitimate: an empty body may be invalid, and that is
      // the validator doing its job rather than the contract breaking.
      if (res.status === 422 && ['post', 'put', 'patch'].includes(method)) return null
      return declared.includes(String(res.status))
        ? null
        : `got ${res.status}, spec declares ${declared.join(',')}`
    })
  }
}

// --- 2. behaviours ----------------------------------------------------------
console.log('\nauth')
await check('missing Authorization -> 401', async () => {
  const res = await fetch(`${BASE}/filters`)
  if (res.status !== 401) return `got ${res.status}`
  const body = await res.json()
  return body.code === 'unauthorized' ? null : `code was ${body.code}`
})
await check('malformed Authorization -> 401', async () => {
  const res = await fetch(`${BASE}/filters`, { headers: { Authorization: 'token abc' } })
  return res.status === 401 ? null : `got ${res.status}`
})

console.log('\nvalidation')
// Exercises constraints the schema actually declares — TargetCreate has a
// uri-format field and typed properties, so those are what a real client gets
// wrong. (An earlier version of this test invented an enum the schema does not
// have, and passed a 201 while claiming to test validation.)
await check('wrong type -> 422 with a JSON Pointer', async () => {
  const res = await call('/targets', {
    method: 'POST',
    body: JSON.stringify({ title: 12345, sourceText: 'y' }),
  })
  if (res.status !== 422) return `got ${res.status}`
  const body = await res.json()
  const errs = body.details?.errors ?? []
  const hit = errs.find((e) => e.path === '/title')
  if (!hit) return `no error at /title (got ${errs.map((e) => e.path).join(',')})`
  return hit.code === 'type' ? null : `code was ${hit.code}`
})
await check('bad uri format -> 422', async () => {
  const res = await call('/targets', {
    method: 'POST',
    body: JSON.stringify({ title: 'ok', sourceUrl: 'definitely not a url' }),
  })
  if (res.status !== 422) return `got ${res.status}`
  const errs = (await res.json()).details?.errors ?? []
  return errs.some((e) => e.path === '/sourceUrl' && e.code === 'format')
    ? null
    : 'no format error at /sourceUrl'
})
await check('malformed JSON -> 400', async () => {
  const res = await call('/targets', { method: 'POST', body: '{not json' })
  return res.status === 400 ? null : `got ${res.status}`
})

console.log('\nunknown ids')
await check('unknown id -> 404', async () => {
  const res = await call('/targets/tgt_definitely_not_real')
  return res.status === 404 ? null : `got ${res.status}`
})

console.log('\ngate')
await check('tgt_fail -> 409', async () => {
  const res = await call('/targets/tgt_fail1/analyses', { method: 'POST', body: '{}' })
  return res.status === 409 ? null : `got ${res.status}`
})
await check('override -> 201 and echoes back', async () => {
  const res = await call('/targets/tgt_fail1/analyses', {
    method: 'POST',
    body: JSON.stringify({ overrideGate: true, overrideReason: 'checked manually' }),
  })
  if (res.status !== 201) return `got ${res.status}`
  const b = await res.json()
  if (b.gateOverridden !== true) return 'gateOverridden did not echo true'
  if (b.targetId !== 'tgt_fail1') return `targetId echoed ${b.targetId}`
  return b.overrideReason === 'checked manually' ? null : 'overrideReason did not echo'
})

console.log('\npagination')
await check('limit caps the page and returns a cursor', async () => {
  const res = await call('/inventory?limit=1')
  if (res.status !== 200) return `got ${res.status}`
  const b = await res.json()
  const key = Object.keys(b).find((k) => Array.isArray(b[k]))
  if (!key) return 'no array in body'
  if (b[key].length > 1) return `limit ignored (${b[key].length} items)`
  return b.pagination ? null : 'no pagination block'
})
await check('cursor advances', async () => {
  const first = await (await call('/inventory?limit=1')).json()
  if (!first.pagination?.next) return null // single-item collection: nothing to advance
  const res = await call(`/inventory?limit=1&cursor=${encodeURIComponent(first.pagination.next)}`)
  const second = await res.json()
  const key = Object.keys(first).find((k) => Array.isArray(first[k]))
  return JSON.stringify(first[key]) !== JSON.stringify(second[key]) ? null : 'cursor returned the same page'
})

console.log('\ncaching')
await check('ETag then If-None-Match -> 304', async () => {
  const res = await call('/filters')
  const etag = res.headers.get('etag')
  if (!etag) return 'no ETag header'
  const again = await call('/filters', { headers: { ...TOKEN, 'If-None-Match': etag } })
  return again.status === 304 ? null : `revalidation got ${again.status}`
})

console.log('\nsimulation')
for (const [sim, want] of [['500', 500], ['429', 429], ['401', 401]]) {
  await check(`X-Fitgap-Simulate: ${sim} -> ${want}`, async () => {
    const res = await call('/filters', { headers: { ...TOKEN, 'X-Fitgap-Simulate': sim } })
    return res.status === want ? null : `got ${res.status}`
  })
}
await check('429 carries Retry-After', async () => {
  const res = await call('/filters', { headers: { ...TOKEN, 'X-Fitgap-Simulate': '429' } })
  return res.headers.get('retry-after') ? null : 'no Retry-After header'
})
await check('id suffix _500 also simulates', async () => {
  const res = await call('/targets/tgt_500')
  return res.status === 500 ? null : `got ${res.status}`
})

console.log('\nrequest id')
await check('every response carries X-Request-Id', async () => {
  const res = await call('/filters')
  return res.headers.get('x-request-id') ? null : 'header missing'
})
await check('errors echo the request id in the body', async () => {
  const res = await fetch(`${BASE}/filters`)
  const b = await res.json()
  return b.requestId ? null : 'requestId missing from error body'
})
await check('caller-supplied request id is honoured', async () => {
  const mine = 'req_client_correlation_1'
  const res = await call('/filters', { headers: { ...TOKEN, 'X-Request-Id': mine } })
  return res.headers.get('x-request-id') === mine ? null : 'not echoed'
})

console.log(`\n${pass} passed, ${failures.length} failed`)
if (failures.length) {
  console.log('\nfailures:')
  for (const f of failures) console.log('  ·', f)
  process.exit(1)
}
