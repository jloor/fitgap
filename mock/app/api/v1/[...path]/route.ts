/**
 * Catch-all mock handler for every Fitgap endpoint.
 *
 * Responses are derived from the OpenAPI definition, never hand-written, so
 * the mock and the published docs cannot drift apart.
 *
 * Two behaviours are simulated rather than read from the spec, because they're
 * the design decisions the docs argue for and a mock that ignored them would
 * misrepresent the API:
 *
 *   1. `POST /targets/{id}/analyses` returns 409 gate_failed when the target id
 *      starts with `tgt_fail`, unless the body sets `overrideGate: true`.
 *   2. `POST /gaps/{id}/excavations` returns the resolved shape, since the
 *      whole point of that endpoint is that answering closes the gap.
 */
import { NextRequest, NextResponse } from 'next/server'
import { spec, matchPath, mockResponse } from '@/lib/openapi'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status: number) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'X-Fitgap-Mock': 'true',
    },
  })

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const doc = spec()
  const requestPath = '/' + (path ?? []).join('/')

  const match = matchPath(doc, requestPath)
  if (!match) {
    return json(
      {
        code: 'not_found',
        message: `No operation matches ${req.method} ${requestPath} in the Fitgap definition.`,
      },
      404,
    )
  }

  // --- Simulated: the gate halts analysis. See "Understanding Gaps". ---
  // Held outside the block so the response can echo what actually happened.
  // Replaying the spec example verbatim meant an overridden request came back
  // saying `gateOverridden: false` — the one place the mock contradicted the
  // request it had just honoured.
  let gate: { overridden: boolean; reason: string | null } | null = null

  if (req.method === 'POST' && match.template === '/targets/{targetId}/analyses') {
    let overridden = false
    let reason: string | null = null
    try {
      const body = (await req.json()) as { overrideGate?: boolean; overrideReason?: string }
      overridden = body?.overrideGate === true
      reason = body?.overrideReason ?? null
    } catch {
      /* empty body is valid here */
    }
    gate = { overridden, reason }
    if (match.params.targetId?.startsWith('tgt_fail') && !overridden) {
      return json(
        {
          code: 'gate_failed',
          message: 'Target failed 1 hard filter and was not analyzed.',
          details: {
            failed: [
              {
                filterId: 'flt_remote',
                reason: 'On-site 5 days; user requires remote or a commute under 45 minutes.',
              },
            ],
          },
        },
        409,
      )
    }
  }

  // --- Simulated: answering an excavation question resolves the gap. ---
  if (req.method === 'POST' && match.template === '/gaps/{gapId}/excavations') {
    return json(
      {
        gap: {
          id: match.params.gapId,
          type: 'unarticulated',
          severity: 'critical',
          resolved: true,
        },
        resolved: true,
        inventoryEntryCreated: 'inv_7Kd2',
      },
      200,
    )
  }

  const result = mockResponse(doc, match.template, req.method)
  if (!result) {
    return json(
      {
        code: 'method_not_allowed',
        message: `${req.method} is not defined for ${match.template}.`,
      },
      405,
    )
  }

  // Responses are derived from the definition, not stored — but where the
  // request carried meaning, the reply should reflect it rather than replay a
  // fixture that disagrees. Only the fields the caller can actually observe as
  // wrong are touched; everything else stays exactly as the spec documents it.
  let body = result.body
  if (gate && body && typeof body === 'object' && !Array.isArray(body)) {
    body = {
      ...(body as Record<string, unknown>),
      targetId: match.params.targetId ?? (body as Record<string, unknown>).targetId,
      gateOverridden: gate.overridden,
      overrideReason: gate.reason,
    }
  }

  return body === null && result.status === 204
    ? new NextResponse(null, { status: 204, headers: { 'X-Fitgap-Mock': 'true' } })
    : json(body, result.status)
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
      'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    },
  })
}
