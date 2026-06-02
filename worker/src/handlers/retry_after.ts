import { text } from "../respond";

const RATE_CODES = new Set([429, 503]);

// /retry-after/:code?seconds=N&date=1
// code 429/503 with a Retry-After header -> monitor Degraded "rate-limited ...".
// date=1 emits the RFC HTTP-date form instead of delta-seconds.
export function handleRetryAfter(req: Request, args: string[]): Response {
  const code = Number.parseInt(args[0] ?? "", 10);
  if (!RATE_CODES.has(code))
    return text("usage: /retry-after/:code  (429|503)  ?seconds=N&date=1\n", 400);

  const u = new URL(req.url);
  const seconds = Number.parseInt(u.searchParams.get("seconds") ?? "30", 10);
  const safeSeconds = Number.isInteger(seconds) && seconds >= 0 ? seconds : 30;

  const value =
    u.searchParams.get("date") === "1"
      ? new Date(Date.now() + safeSeconds * 1000).toUTCString()
      : String(safeSeconds);

  return text(`rate limited ${code}\n`, code, { "retry-after": value });
}
