import { parseIntArg, text } from "../respond";

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

// /redirect/:n -> chain of n 302 hops to /redirect/(n-1), terminating in 200.
// n greater than the monitor's max_redirects triggers "too many redirects".
export function handleRedirect(_req: Request, args: string[]): Response {
  const n = parseIntArg(args[0], 0);
  if (n === null) return text("usage: /redirect/:n  (n hops, n>=0)\n", 400);
  if (n === 0) return text("redirect chain complete\n", 200);
  return new Response(null, { status: 302, headers: { location: `/redirect/${n - 1}` } });
}

// /redirect-to?url=ABS&status=30x
// 307/308 preserve method+body; 301/302/303 downgrade to GET. Cross-origin url
// exercises credential stripping; non-http(s) url exercises unsupported-scheme.
export function handleRedirectTo(req: Request): Response {
  const u = new URL(req.url);
  const target = u.searchParams.get("url");
  const status = Number.parseInt(u.searchParams.get("status") ?? "302", 10);
  if (!target) return text("usage: /redirect-to?url=<abs-url>&status=30x\n", 400);
  if (!REDIRECT_CODES.has(status)) return text("status must be one of 301,302,303,307,308\n", 400);

  // Parse to a normalized absolute URL; rejects malformed input and strips any
  // CR/LF that would otherwise be a header-injection vector.
  let location: string;
  try {
    location = new URL(target).href;
  } catch {
    return text("url must be an absolute URL\n", 400);
  }
  return new Response(null, { status, headers: { location } });
}
