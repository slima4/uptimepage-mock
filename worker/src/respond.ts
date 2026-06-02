// Shared response helpers: CORS, body-less status handling, JSON/text, sleep.

const BODYLESS = new Set([101, 204, 205, 304]);

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "*",
};

export function withCors(res: Response): Response {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

export function text(body: string, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  if (!h.has("content-type")) h.set("content-type", "text/plain; charset=utf-8");
  return new Response(BODYLESS.has(status) ? null : body, { status, headers: h });
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set("content-type", "application/json; charset=utf-8");
  const body = BODYLESS.has(status) ? null : `${JSON.stringify(data, null, 2)}\n`;
  return new Response(body, { status, headers: h });
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Parse a non-negative integer arg, optionally clamped to max. Returns null for
// non-integers or values below min so callers can emit a 400.
export function parseIntArg(raw: string | undefined, min: number, max?: number): number | null {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isInteger(n) || n < min) return null;
  return max !== undefined ? Math.min(n, max) : n;
}

export function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}
