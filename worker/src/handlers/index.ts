const ENDPOINTS: [string, string][] = [
  ["/status/:code", "exact status code (e.g. /status/503)"],
  ["/status/:a,:b,:c", "random one-of the listed codes"],
  ["/status/:code?body=TEXT", "status + body text"],
  ["/body?text=TEXT", "200 with given body (drive keyword match)"],
  ["/large?bytes=N", "stream N bytes (test body-size caps)"],
  ["/gzip", "gzip-encoded body"],
  ["/brotli", "brotli-encoded body"],
  ["/bad-gzip", "Content-Encoding: gzip with garbage (decode failure)"],
  ["/redirect/:n", "chain of n redirect hops, then 200"],
  ["/redirect-to?url=ABS&status=30x", "single redirect to url with 301/302/303/307/308"],
  ["/delay/:secs", "wait secs (0-30) then 200"],
  ["/slow-body/:secs", "fast headers, trickled body (body timeout)"],
  ["/auth/basic/:user/:pass", "HTTP basic auth challenge"],
  ["/auth/bearer/:token", "bearer token challenge"],
  ["/retry-after/:code?seconds=N&date=1", "429/503 with Retry-After"],
  ["/method", "reflect request method"],
  ["/method/:verb", "200 if method matches, else 405"],
  ["/echo", "reflect method, headers, body"],
  ["/headers", "echo request headers"],
  ["/set-header?name=X&value=Y", "set arbitrary response headers (repeatable)"],
  ["/flap?period=N", "alternate up/down every N seconds"],
  ["/cors", "CORS-enabled marker (CORS headers are on every response)"],
];

export function handleIndex(): Response {
  const rows = ENDPOINTS.map(
    ([path, desc]) => `<tr><td><code>${path}</code></td><td>${desc}</td></tr>`,
  ).join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>uptimepage-mock</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 760px; margin: 3rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { font-size: 1.4rem; }
  table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
  td { border-bottom: 1px solid #eee; padding: .45rem .5rem; vertical-align: top; }
  code { background: #f4f4f5; padding: .1rem .3rem; border-radius: 4px; }
  a { color: #2563eb; }
</style>
</head>
<body>
<h1>uptimepage-mock</h1>
<p>Deterministic HTTP endpoints for testing uptime monitors. Every response carries permissive CORS headers.</p>
<table>
${rows}
</table>
<p>Protocol-level fixtures (TLS cert / TCP / DNS) live in the <a href="https://github.com/uptimepage/uptimepage-mock">repository</a>.</p>
</body>
</html>
`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
