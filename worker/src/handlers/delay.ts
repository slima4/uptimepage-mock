import { parseIntArg, sleep, text } from "../respond";

const MAX_SECS = 30;

// /delay/:secs -> wait then 200. Past the monitor timeout this is a request/TTFB
// timeout; within the latency threshold it is a degraded/slow signal.
export async function handleDelay(_req: Request, args: string[]): Promise<Response> {
  const secs = parseIntArg(args[0], 0, MAX_SECS);
  if (secs === null) return text("usage: /delay/:secs  (0-30)\n", 400);
  await sleep(secs * 1000);
  return text(`delayed ${secs}s\n`, 200);
}

// /slow-body/:secs -> headers immediately, body trickles one line/sec.
// Exercises the "body timeout" branch (TTFB ok, body collection too slow).
export function handleSlowBody(_req: Request, args: string[]): Response {
  const secs = parseIntArg(args[0], 0, MAX_SECS);
  if (secs === null) return text("usage: /slow-body/:secs  (0-30)\n", 400);

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode("start\n"));
      for (let i = 0; i < secs; i++) {
        await sleep(1000);
        controller.enqueue(enc.encode(`chunk ${i + 1}\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
