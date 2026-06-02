import { headersToObject, json, parseIntArg, text } from "../respond";

const DEFAULT_BYTES = 1024 * 1024; // 1 MiB
const MAX_BYTES = 12 * 1024 * 1024; // headroom past the monitor's 1/8 MiB caps

// /body?text=TEXT -> 200 with TEXT (drive expected_body_contains pass/fail).
export function handleBody(req: Request): Response {
  const t = new URL(req.url).searchParams.get("text") ?? "uptimepage-mock body";
  return text(`${t}\n`, 200);
}

// /large?bytes=N -> N bytes streamed (test >1 MiB raw / >8 MiB decompressed caps).
export function handleLarge(req: Request): Response {
  const raw = new URL(req.url).searchParams.get("bytes") ?? String(DEFAULT_BYTES);
  const bytes = parseIntArg(raw, 0, MAX_BYTES);
  if (bytes === null) return text("usage: /large?bytes=N\n", 400);

  const chunk = new Uint8Array(64 * 1024).fill(0x61); // 'a'
  let sent = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (sent >= bytes) {
        controller.close();
        return;
      }
      const n = Math.min(chunk.length, bytes - sent);
      controller.enqueue(n === chunk.length ? chunk : chunk.subarray(0, n));
      sent += n;
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/octet-stream", "content-length": String(bytes) },
  });
}

// /echo -> reflect request method, headers, and body (POST/PUT validation).
export async function handleEcho(req: Request): Promise<Response> {
  return json({
    method: req.method,
    url: req.url,
    headers: headersToObject(req.headers),
    body: await req.text(),
  });
}
