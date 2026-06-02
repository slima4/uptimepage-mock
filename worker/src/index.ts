import { route } from "./router";

export default {
  async fetch(req: Request): Promise<Response> {
    try {
      return await route(req);
    } catch (e) {
      // Error boundary: any handler throw becomes a controlled 500, never a
      // bare runtime crash.
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(`mock error: ${msg}\n`, {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "access-control-allow-origin": "*",
        },
      });
    }
  },
} satisfies ExportedHandler;
