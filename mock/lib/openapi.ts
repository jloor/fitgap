/**
 * A small OpenAPI-driven mock.
 *
 * Everything this server returns comes from `spec/fitgap.yaml` — matching the
 * request to an operation, then producing a response from that operation's
 * documented example, or synthesising one from its schema when no example
 * exists. There is no hand-written fixture anywhere, deliberately: the docs and
 * the mock cannot disagree, because they're the same file.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

type Json = Record<string, unknown>

let cached: Json | null = null

export function spec(): Json {
  if (!cached) {
    const file = join(process.cwd(), 'spec', 'fitgap.yaml')
    cached = parse(readFileSync(file, 'utf8')) as Json
  }
  return cached
}

/** Resolve a local `$ref` (`#/components/schemas/Gap`) against the document. */
function deref(doc: Json, node: unknown, seen = new Set<string>()): unknown {
  if (!node || typeof node !== 'object') return node
  const obj = node as Json
  const ref = obj.$ref
  if (typeof ref === 'string' && ref.startsWith('#/')) {
    if (seen.has(ref)) return {} // cycle guard
    seen.add(ref)
    let target: unknown = doc
    for (const part of ref.slice(2).split('/')) {
      target = (target as Json)?.[part]
    }
    return deref(doc, target, seen)
  }
  return node
}

/**
 * Match a concrete request path against the spec's templated paths.
 * `/targets/tgt_91aF/analyses` → `/targets/{targetId}/analyses`
 */
export function matchPath(doc: Json, path: string): { template: string; params: Record<string, string> } | null {
  const paths = (doc.paths ?? {}) as Record<string, unknown>
  const wanted = path.split('/').filter(Boolean)

  for (const template of Object.keys(paths)) {
    const parts = template.split('/').filter(Boolean)
    if (parts.length !== wanted.length) continue

    const params: Record<string, string> = {}
    const ok = parts.every((part, i) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        params[part.slice(1, -1)] = wanted[i]
        return true
      }
      return part === wanted[i]
    })
    if (ok) return { template, params }
  }
  return null
}

/** Build a plausible value for a schema that carries no example. */
function fromSchema(doc: Json, schema: unknown, depth = 0): unknown {
  const s = deref(doc, schema) as Json
  if (!s || depth > 6) return null

  if (s.example !== undefined) return s.example
  if (Array.isArray(s.examples) && s.examples.length) return s.examples[0]
  if (Array.isArray(s.enum) && s.enum.length) return s.enum[0]

  if (Array.isArray(s.allOf)) {
    return Object.assign({}, ...s.allOf.map((sub) => fromSchema(doc, sub, depth + 1) as Json))
  }

  const type = Array.isArray(s.type) ? s.type.find((t) => t !== 'null') : s.type

  switch (type) {
    case 'object': {
      const out: Json = {}
      for (const [key, sub] of Object.entries((s.properties ?? {}) as Json)) {
        out[key] = fromSchema(doc, sub, depth + 1)
      }
      return out
    }
    case 'array':
      return [fromSchema(doc, s.items, depth + 1)].filter((v) => v !== null)
    case 'integer':
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'string':
      if (s.format === 'date-time') return '2026-08-04T18:00:00.000Z'
      if (s.format === 'uri') return 'https://example.com'
      return 'string'
    default:
      return null
  }
}

/**
 * Pick the response to return. Prefers the lowest documented 2xx, then falls
 * back to the first documented status — so an operation that only documents a
 * 409 still mocks usefully.
 */
export function mockResponse(
  doc: Json,
  template: string,
  method: string,
): { status: number; body: unknown } | null {
  const op = ((doc.paths as Json)?.[template] as Json)?.[method.toLowerCase()] as Json | undefined
  if (!op) return null

  const responses = (op.responses ?? {}) as Record<string, unknown>
  const codes = Object.keys(responses)
  const success = codes.filter((c) => /^2\d\d$/.test(c)).sort()[0]
  const code = success ?? codes[0]
  if (!code) return { status: 204, body: null }

  const response = deref(doc, responses[code]) as Json
  const media = ((response?.content ?? {}) as Json)['application/json'] as Json | undefined

  if (media) {
    if (media.example !== undefined) return { status: Number(code), body: media.example }
    const examples = media.examples as Json | undefined
    if (examples) {
      const first = Object.values(examples)[0] as Json | undefined
      if (first && 'value' in first) return { status: Number(code), body: first.value }
    }
    return { status: Number(code), body: fromSchema(doc, media.schema) }
  }

  return { status: Number(code), body: null }
}
