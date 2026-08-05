/**
 * Catch-all mock handler for every Fitgap endpoint.
 *
 * Responses are derived from the OpenAPI definition, never hand-written, so the
 * mock and the published docs cannot drift apart.
 *
 * Beyond replaying the spec, this behaves like an API someone has to integrate
 * against rather than one they only ever see succeed:
 *
 *   · Bearer auth, so the commonest first failure is reproducible here
 *   · request bodies validated against the schema, returning a real 422 with
 *     JSON Pointer paths to each offending field
 *   · unknown ids 404 instead of cheerfully returning the example
 *   · cursor pagination on collections
 *   · ETag / If-None-Match returning 304
 *   · deliberate failures via the X-Fitgap-Simulate header or magic id suffixes
 *   · a request id on every response, echoed into every error body
 *
 * Two behaviours are simulated rather than read from the spec, because they are
 * the design decisions the docs argue for and a mock ignoring them would
 * misrepresent the API:
 *
 *   1. `POST /targets/{id}/analyses` returns 409 gate_failed when the target id
 *      starts with `tgt_fail`, unless the body sets `overrideGate: true`.
 *   2. `POST /gaps/{id}/excavations` returns the resolved shape, since the whole
 *      point of that endpoint is that answering closes the gap.
 */
import { NextRequest, NextResponse } from 'next/server'
import { spec, matchPath, mockResponse } from '@/lib/openapi'
import { validate, requestSchema } from '@/lib/validate'
import {
  REQUEST_ID_HEADER,
  SIMULATE_HEADER,
  requestId,
  simulationFor,
  authError,
  etagFor,
  paginate,
  isKnownId,
} from '@/lib/behaviours'

export const dynamic = 'force-dynamic'

const BASE_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'X-Fitgap-Mock': 'true',
}

const json = (body: unknown, status: number, rid: string, extra: Record<string, string> = {}) =>
  NextResponse.json(body, {
    status,
    headers: { ...BASE_HEADERS, [REQUEST_ID_HEADER]: rid, ...extra },
  })

/** Errors carry the request id in the body too — the one a customer pastes. */
const fail = (
  rid: string,
  status: number,
  code: string,
  message: string,
  details?: unknown,
  extra: Record<string, string> = {},
) => json({ code, message, requestId: rid, ...(details ? { details } : {}) }, status, rid, extra)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const rid = requestId(req.headers.get(REQUEST_ID_HEADER))
  const doc = spec()
  const requestPath = '/' + (path ?? []).join('/')

  const match = matchPath(doc, requestPath)
  if (!match) {
    return fail(
      rid,
      404,
      'not_found',
      `No operation matches ${req.method} ${requestPath} in the Fitgap definition.`,
    )
  }

  const idValues = Object.values(match.params ?? {})

  // --- Deliberate failures, before anything else can succeed ---------------
  const sim = simulationFor(req.headers.get(SIMULATE_HEADER), idValues)
  if (sim) {
    if (sim.delayMs) await sleep(sim.delayMs)
    if (sim.status !== 200) {
      return fail(
        rid,
        sim.status,
        sim.code,
        sim.message,
        undefined,
        sim.retryAfter ? { 'Retry-After': String(sim.retryAfter) } : {},
      )
    }
  }

  // --- Auth ----------------------------------------------------------------
  const auth = authError(req.headers.get('authorization'))
  if (auth) {
    return fail(rid, 401, auth.code, auth.message, undefined, {
      'WWW-Authenticate': 'Bearer realm="fitgap"',
    })
  }

  // --- Unknown ids 404 rather than returning someone else's example --------
  for (const [name, value] of Object.entries(match.params ?? {})) {
    if (!isKnownId(value)) {
      return fail(rid, 404, 'not_found', `No resource with ${name} "${value}".`, {
        hint: 'The mock recognises the ids used in the guides, e.g. tgt_91aF, ana_04Bq, gap_5Qw2.',
      })
    }
  }

  // --- Request body validation --------------------------------------------
  let parsedBody: unknown = undefined
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const raw = await req.text()
    if (raw.trim()) {
      try {
        parsedBody = JSON.parse(raw)
      } catch {
        return fail(rid, 400, 'malformed_json', 'Request body is not valid JSON.')
      }
    }
    const schema = requestSchema(doc, match.template, req.method)
    if (schema && parsedBody !== undefined) {
      const errors = validate(parsedBody, schema, '', doc)
      if (errors.length) {
        return fail(
          rid,
          422,
          'validation_failed',
          `Request body failed validation against the ${match.template} schema.`,
          { errors },
        )
      }
    }
  }

  // --- Simulated: the gate halts analysis. See "Understanding Gaps". -------
  let gate: { overridden: boolean; reason: string | null } | null = null
  if (req.method === 'POST' && match.template === '/targets/{targetId}/analyses') {
    const body = (parsedBody ?? {}) as { overrideGate?: boolean; overrideReason?: string }
    gate = { overridden: body?.overrideGate === true, reason: body?.overrideReason ?? null }
    if (match.params.targetId?.startsWith('tgt_fail') && !gate.overridden) {
      return fail(rid, 409, 'gate_failed', 'Target failed 1 hard filter and was not analyzed.', {
        failed: [
          {
            filterId: 'flt_remote',
            reason: 'On-site 5 days; user requires remote or a commute under 45 minutes.',
          },
        ],
      })
    }
  }

  // --- Simulated: answering an excavation question resolves the gap --------
  if (req.method === 'POST' && match.template === '/gaps/{gapId}/excavations') {
    return json(
      {
        gap: { id: match.params.gapId, type: 'unarticulated', severity: 'critical', resolved: true },
        resolved: true,
        inventoryEntryCreated: 'inv_7Kd2',
      },
      200,
      rid,
    )
  }

  const result = mockResponse(doc, match.template, req.method)
  if (!result) {
    return fail(
      rid,
      405,
      'method_not_allowed',
      `${req.method} is not defined for ${match.template}.`,
      undefined,
      { Allow: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
    )
  }

  // Responses come from the definition, but where the request carried meaning
  // the reply should reflect it rather than replay a fixture that disagrees.
  let body = result.body
  if (gate && body && typeof body === 'object' && !Array.isArray(body)) {
    body = {
      ...(body as Record<string, unknown>),
      targetId: match.params.targetId ?? (body as Record<string, unknown>).targetId,
      gateOverridden: gate.overridden,
      overrideReason: gate.reason,
    }
  }

  // --- Pagination on collection reads --------------------------------------
  const extraHeaders: Record<string, string> = {}
  if (req.method === 'GET' && body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    const listKey = Object.keys(obj).find((k) => Array.isArray(obj[k]))
    if (listKey) {
      const url = new URL(req.url)
      const { page, next, limit, total } = paginate(
        obj[listKey] as unknown[],
        url.searchParams.get('limit'),
        url.searchParams.get('cursor'),
      )
      body = { ...obj, [listKey]: page, pagination: { limit, total, next } }
      if (next) {
        url.searchParams.set('cursor', next)
        extraHeaders.Link = `<${url.toString()}>; rel="next"`
      }
    }
  }

  // --- Conditional requests ------------------------------------------------
  if (req.method === 'GET' && result.status === 200) {
    const etag = etagFor(body)
    extraHeaders.ETag = etag
    extraHeaders['Cache-Control'] = 'public, max-age=0, must-revalidate'
    const inm = req.headers.get('if-none-match')
    if (inm && inm.split(',').some((t) => t.trim() === etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: { ...BASE_HEADERS, [REQUEST_ID_HEADER]: rid, ETag: etag },
      })
    }
  }

  return body === null && result.status === 204
    ? new NextResponse(null, { status: 204, headers: { ...BASE_HEADERS, [REQUEST_ID_HEADER]: rid } })
    : json(body, result.status, rid, extraHeaders)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': `Authorization,Content-Type,${REQUEST_ID_HEADER},${SIMULATE_HEADER}`,
      'Access-Control-Expose-Headers': `${REQUEST_ID_HEADER},ETag,Link,Retry-After`,
    },
  })
}
