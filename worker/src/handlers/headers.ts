import { headersToObject, json, text } from "../respond";

// /headers -> echo request headers as JSON.
export function handleHeaders(req: Request): Response {
  return json({ headers: headersToObject(req.headers) });
}

// /set-header?name=X&value=Y (repeatable, paired by index) -> set arbitrary
// response headers; useful for sensitive-header redaction in probe output.
export function handleSetHeader(req: Request): Response {
  const params = new URL(req.url).searchParams;
  const names = params.getAll("name");
  const values = params.getAll("value");
  if (names.length === 0) return text("usage: /set-header?name=X&value=Y  (repeatable)\n", 400);

  const h = new Headers({ "content-type": "text/plain; charset=utf-8" });
  try {
    for (const [i, name] of names.entries()) h.append(name, values[i] ?? "");
  } catch {
    // Invalid header name/value token (e.g. spaces, CR/LF) -> controlled 400.
    return text("invalid header name or value\n", 400);
  }
  return new Response("headers set\n", { status: 200, headers: h });
}
