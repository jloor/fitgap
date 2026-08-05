/**
 * Request-body validation against the OpenAPI schema.
 *
 * Deliberately hand-written rather than pulled from a JSON-Schema library. The
 * spec uses a small, known subset — type, required, enum, format, minimum,
 * maxLength, nested objects and arrays — and a focused validator that reports
 * JSON Pointer paths is worth more here than a dependency that reports
 * everything. It also means the 422 body says exactly which field is wrong and
 * why, which is the whole reason a consumer reads a 422 at all.
 *
 * The contract this upholds: if the spec declares 422, the mock must be able to
 * produce one. An API that only ever returns success teaches nothing about how
 * it fails, and how it fails is what support actually gets asked about.
 */

type Json = Record<string, unknown>

export interface FieldError {
  /** JSON Pointer to the offending value, e.g. `/filters/0/kind`. */
  path: string
  /** Machine-readable reason, stable enough to branch on. */
  code:
    | 'required'
    | 'type'
    | 'enum'
    | 'format'
    | 'minimum'
    | 'maximum'
    | 'minLength'
    | 'maxLength'
    | 'additional_property'
  message: string
}

const typeOf = (v: unknown): string => {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  if (Number.isInteger(v)) return 'integer'
  return typeof v
}

/** OpenAPI `integer` is a JSON `number`; everything else maps directly. */
const typeMatches = (declared: string, actual: string): boolean =>
  declared === actual ||
  (declared === 'number' && actual === 'integer') ||
  (declared === 'integer' && actual === 'integer')

const FORMATS: Record<string, RegExp> = {
  'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  uri: /^https?:\/\/\S+$/i,
  email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
}

/**
 * Walk a value against a schema, collecting every problem rather than throwing
 * on the first. A consumer fixing a payload wants the whole list, not a
 * round-trip per field.
 */
export function validate(value: unknown, schema: Json, path = '', doc?: Json): FieldError[] {
  if (!schema || typeof schema !== 'object') return []

  // $ref — resolve against the document if one was supplied.
  const ref = schema.$ref as string | undefined
  if (ref && doc) {
    const target = ref.replace(/^#\//, '').split('/').reduce<unknown>(
      (acc, key) => (acc as Json | undefined)?.[key],
      doc,
    )
    return target ? validate(value, target as Json, path, doc) : []
  }

  const errors: FieldError[] = []
  const declared = schema.type as string | undefined

  if (value === undefined || value === null) {
    if (schema.nullable === true || value === undefined) return errors
  }

  if (declared && !typeMatches(declared, typeOf(value))) {
    errors.push({
      path: path || '/',
      code: 'type',
      message: `Expected ${declared}, received ${typeOf(value)}.`,
    })
    return errors // a wrong type makes every nested check noise
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value as never)) {
    errors.push({
      path: path || '/',
      code: 'enum',
      message: `Expected one of: ${(schema.enum as unknown[]).join(', ')}.`,
    })
  }

  if (typeof value === 'string') {
    const fmt = schema.format as string | undefined
    if (fmt && FORMATS[fmt] && !FORMATS[fmt].test(value)) {
      errors.push({ path: path || '/', code: 'format', message: `Expected format ${fmt}.` })
    }
    const min = schema.minLength as number | undefined
    const max = schema.maxLength as number | undefined
    if (typeof min === 'number' && value.length < min) {
      errors.push({ path: path || '/', code: 'minLength', message: `Minimum length ${min}.` })
    }
    if (typeof max === 'number' && value.length > max) {
      errors.push({ path: path || '/', code: 'maxLength', message: `Maximum length ${max}.` })
    }
  }

  if (typeof value === 'number') {
    const min = schema.minimum as number | undefined
    const max = schema.maximum as number | undefined
    if (typeof min === 'number' && value < min) {
      errors.push({ path: path || '/', code: 'minimum', message: `Minimum ${min}.` })
    }
    if (typeof max === 'number' && value > max) {
      errors.push({ path: path || '/', code: 'maximum', message: `Maximum ${max}.` })
    }
  }

  if (typeOf(value) === 'object') {
    const obj = value as Json
    const props = (schema.properties ?? {}) as Record<string, Json>
    const required = (schema.required ?? []) as string[]

    for (const key of required) {
      if (obj[key] === undefined) {
        errors.push({
          path: `${path}/${key}`,
          code: 'required',
          message: `Missing required property "${key}".`,
        })
      }
    }
    for (const [key, sub] of Object.entries(props)) {
      if (obj[key] !== undefined) errors.push(...validate(obj[key], sub, `${path}/${key}`, doc))
    }
    // additionalProperties:false is a real contract — a typo'd field name is
    // one of the most common integration errors and silence is unhelpful.
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (!(key in props)) {
          errors.push({
            path: `${path}/${key}`,
            code: 'additional_property',
            message: `Unrecognised property "${key}".`,
          })
        }
      }
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => errors.push(...validate(item, schema.items as Json, `${path}/${i}`, doc)))
  }

  return errors
}

/** The request-body schema for an operation, or null when it takes no body. */
export function requestSchema(doc: Json, template: string, method: string): Json | null {
  const paths = doc.paths as Record<string, Json> | undefined
  const op = paths?.[template]?.[method.toLowerCase() as keyof Json] as Json | undefined
  const body = op?.requestBody as Json | undefined
  const content = body?.content as Record<string, Json> | undefined
  return (content?.['application/json']?.schema as Json) ?? null
}
