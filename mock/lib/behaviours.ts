/**
 * The behaviours that make this a sandbox rather than a demo.
 *
 * A mock that only returns 200 teaches a consumer how the API works on its best
 * day. Most integration time is spent on the other days — the 401 with a stale
 * token, the 429 under load, the timeout that looked like a hang. These are the
 * cases you want someone to be able to reproduce deliberately, before they meet
 * them in production at 2am.
 */

export const REQUEST_ID_HEADER = 'X-Request-Id'
export const SIMULATE_HEADER = 'X-Fitgap-Simulate'

/**
 * A request id on every response, echoed into error bodies.
 *
 * This is the first thing support asks a customer for, so an API that does not
 * hand one out is quietly making its own tickets harder. Generated per request;
 * a caller-supplied value is honoured so a client's own correlation id survives
 * the hop.
 */
export function requestId(incoming?: string | null): string {
  if (incoming && /^[\w.:-]{6,80}$/.test(incoming)) return incoming
  const rand = Math.random().toString(36).slice(2, 10)
  return `req_${Date.now().toString(36)}${rand}`
}

/** Magic ids and headers that force a failure, so the sad paths are reachable. */
export interface Simulation {
  status: number
  code: string
  message: string
  delayMs?: number
  retryAfter?: number
}

const BY_HEADER: Record<string, Simulation> = {
  '500': { status: 500, code: 'internal_error', message: 'Simulated server error.' },
  '502': { status: 502, code: 'bad_gateway', message: 'Simulated upstream failure.' },
  '429': { status: 429, code: 'rate_limited', message: 'Simulated rate limit.', retryAfter: 30 },
  '401': { status: 401, code: 'unauthorized', message: 'Simulated auth failure.' },
  timeout: { status: 504, code: 'gateway_timeout', message: 'Simulated timeout.', delayMs: 5000 },
  slow: { status: 200, code: '', message: '', delayMs: 5000 },
}

/** Ids carry the same simulations, for clients that cannot set headers. */
const BY_ID: Record<string, keyof typeof BY_HEADER> = {
  _500: '500',
  _429: '429',
  _slow: 'slow',
  _timeout: 'timeout',
}

export function simulationFor(header: string | null, ids: string[]): Simulation | null {
  if (header) {
    const hit = BY_HEADER[header.trim().toLowerCase()]
    if (hit) return hit
  }
  for (const id of ids) {
    for (const [suffix, key] of Object.entries(BY_ID)) {
      if (id?.endsWith(suffix)) return BY_HEADER[key]
    }
  }
  return null
}

/**
 * Bearer auth. Any non-empty token is accepted — this is a mock, and demanding
 * a real credential would make it useless as a sandbox — but a MISSING or
 * malformed header is rejected, because "I forgot the header" is the single
 * most common first failure against any API and it should be reproducible here.
 */
export function authError(header: string | null): { code: string; message: string } | null {
  if (!header) {
    return {
      code: 'unauthorized',
      message: 'Missing Authorization header. Send: Authorization: Bearer <any-token>.',
    }
  }
  if (!/^Bearer\s+\S+/i.test(header)) {
    return {
      code: 'unauthorized',
      message: `Malformed Authorization header. Expected "Bearer <token>", received "${header.slice(0, 24)}".`,
    }
  }
  return null
}

/** A weak ETag over the response body, so conditional requests are meaningful. */
export function etagFor(body: unknown): string {
  const s = JSON.stringify(body ?? null)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `W/"${(h >>> 0).toString(16)}-${s.length.toString(16)}"`
}

/**
 * Cursor pagination over an array body.
 *
 * Opaque base64 cursors rather than `?page=2`, because that is what the spec
 * documents and what a consumer should be taught to treat as opaque. Returns
 * the page plus the cursor for the next one, or null when the list is done.
 */
export function paginate<T>(
  items: T[],
  limitRaw: string | null,
  cursorRaw: string | null,
): { page: T[]; next: string | null; limit: number; total: number } {
  const limit = Math.min(Math.max(parseInt(limitRaw ?? '25', 10) || 25, 1), 100)
  let offset = 0
  if (cursorRaw) {
    try {
      const decoded = Buffer.from(cursorRaw, 'base64').toString('utf8')
      const parsed = parseInt(decoded.replace(/^offset:/, ''), 10)
      if (Number.isFinite(parsed) && parsed >= 0) offset = parsed
    } catch {
      /* an unreadable cursor restarts the list rather than erroring */
    }
  }
  const page = items.slice(offset, offset + limit)
  const nextOffset = offset + page.length
  const next =
    nextOffset < items.length ? Buffer.from(`offset:${nextOffset}`).toString('base64') : null
  return { page, next, limit, total: items.length }
}

/** Ids the demo data knows about; anything else is a genuine 404. */
export const KNOWN_IDS = new Set([
  'tgt_91aF',
  'ana_04Bq',
  'gap_5Qw2',
  'gap_3Xz8',
  'prj_7Hn3',
  'inv_7Kd2',
  'flt_remote',
  'flt_band',
])

/**
 * Does this id exist? Prefixes reserved for simulation always "exist" so their
 * behaviour can fire, and the gate demo ids resolve so the 409 path is testable.
 */
export function isKnownId(id: string): boolean {
  if (!id) return false
  if (KNOWN_IDS.has(id)) return true
  if (id.startsWith('tgt_fail')) return true
  return Object.keys(BY_ID).some((suffix) => id.endsWith(suffix))
}
