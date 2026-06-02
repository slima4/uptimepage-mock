import brotliPayload from "./brotli_payload";

// no-transform stops the Cloudflare edge from re-compressing an already-encoded
// body, which would otherwise double-encode it under a single Content-Encoding.
const NO_TRANSFORM = "no-transform";

// /gzip -> gzip-compressed body with Content-Encoding: gzip (decode path).
export function handleGzip(): Response {
  const data = new TextEncoder().encode("uptimepage-mock gzip ok\n");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  }).pipeThrough(new CompressionStream("gzip"));
  return new Response(stream, {
    headers: {
      "content-encoding": "gzip",
      "content-type": "text/plain; charset=utf-8",
      "cache-control": NO_TRANSFORM,
    },
  });
}

// /brotli -> brotli-compressed body (CompressionStream has no "br", so a payload
// precompressed by scripts/gen-brotli.mjs is shipped as base64).
export function handleBrotli(): Response {
  const bytes = Uint8Array.from(atob(brotliPayload), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "content-encoding": "br",
      "content-type": "text/plain; charset=utf-8",
      "cache-control": NO_TRANSFORM,
    },
  });
}

// /bad-gzip -> Content-Encoding: gzip with non-gzip bytes -> "decode" Down.
export function handleBadGzip(): Response {
  const garbage = new Uint8Array([0x1f, 0x8b, 0x08, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return new Response(garbage, {
    headers: {
      "content-encoding": "gzip",
      "content-type": "text/plain",
      "cache-control": NO_TRANSFORM,
    },
  });
}
