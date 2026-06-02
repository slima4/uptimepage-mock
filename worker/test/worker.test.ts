import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const BASE = "https://mock.example";

describe("status", () => {
  it("returns the exact code", async () => {
    const r = await SELF.fetch(`${BASE}/status/503`);
    expect(r.status).toBe(503);
  });

  it("returns one of the listed codes", async () => {
    const r = await SELF.fetch(`${BASE}/status/200,500`);
    expect([200, 500]).toContain(r.status);
  });

  it("includes the body override", async () => {
    const r = await SELF.fetch(`${BASE}/status/200?body=HELLO`);
    expect(await r.text()).toContain("HELLO");
  });

  it("rejects an invalid code", async () => {
    const r = await SELF.fetch(`${BASE}/status/999999`);
    expect(r.status).toBe(400);
  });

  it("rejects a 1xx code the Response constructor cannot emit", async () => {
    const r = await SELF.fetch(`${BASE}/status/150`);
    expect(r.status).toBe(400);
  });
});

describe("redirect", () => {
  it("emits a relative Location for a chain hop", async () => {
    const r = await SELF.fetch(`${BASE}/redirect/3`, { redirect: "manual" });
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("/redirect/2");
  });

  it("terminates with 200", async () => {
    const r = await SELF.fetch(`${BASE}/redirect/0`, { redirect: "manual" });
    expect(r.status).toBe(200);
  });

  it("redirect-to honours the chosen status", async () => {
    const r = await SELF.fetch(`${BASE}/redirect-to?url=https://example.com&status=308`, {
      redirect: "manual",
    });
    expect(r.status).toBe(308);
    expect(r.headers.get("location")).toBe("https://example.com/");
  });

  it("redirect-to rejects a non-3xx status", async () => {
    const r = await SELF.fetch(`${BASE}/redirect-to?url=https://example.com&status=200`);
    expect(r.status).toBe(400);
  });

  it("redirect-to rejects a non-absolute / malformed url", async () => {
    const r = await SELF.fetch(`${BASE}/redirect-to?url=/relative&status=302`);
    expect(r.status).toBe(400);
  });
});

describe("auth", () => {
  it("401s without credentials", async () => {
    const r = await SELF.fetch(`${BASE}/auth/basic/alice/secret`);
    expect(r.status).toBe(401);
    expect(r.headers.get("www-authenticate")).toContain("Basic");
  });

  it("200s with the right basic credentials", async () => {
    const r = await SELF.fetch(`${BASE}/auth/basic/alice/secret`, {
      headers: { authorization: `Basic ${btoa("alice:secret")}` },
    });
    expect(r.status).toBe(200);
  });

  it("200s with the right bearer token", async () => {
    const r = await SELF.fetch(`${BASE}/auth/bearer/t0ken`, {
      headers: { authorization: "Bearer t0ken" },
    });
    expect(r.status).toBe(200);
  });
});

describe("retry-after", () => {
  it("sets the Retry-After header on a 429", async () => {
    const r = await SELF.fetch(`${BASE}/retry-after/429?seconds=42`);
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("42");
  });

  it("rejects a non-rate-limit code", async () => {
    const r = await SELF.fetch(`${BASE}/retry-after/200`);
    expect(r.status).toBe(400);
  });
});

describe("encoding", () => {
  it("gzip decodes to the expected text", async () => {
    const r = await SELF.fetch(`${BASE}/gzip`);
    expect(r.headers.get("content-encoding")).toBe("gzip");
    const buf = await r.arrayBuffer();
    const ds = new DecompressionStream("gzip");
    const decoded = await new Response(new Blob([buf]).stream().pipeThrough(ds)).text();
    expect(decoded).toContain("gzip ok");
  });

  it("brotli advertises the br encoding", async () => {
    const r = await SELF.fetch(`${BASE}/brotli`);
    expect(r.headers.get("content-encoding")).toBe("br");
  });

  it("bad-gzip advertises gzip", async () => {
    const r = await SELF.fetch(`${BASE}/bad-gzip`);
    expect(r.headers.get("content-encoding")).toBe("gzip");
  });
});

describe("delay", () => {
  it("returns 200 after a short delay", async () => {
    const r = await SELF.fetch(`${BASE}/delay/0`);
    expect(r.status).toBe(200);
  });
});

describe("method", () => {
  it("reflects the request method", async () => {
    const r = await SELF.fetch(`${BASE}/method`, { method: "POST" });
    expect(await r.json()).toMatchObject({ method: "POST" });
  });

  it("405s on a method mismatch", async () => {
    const r = await SELF.fetch(`${BASE}/method/post`);
    expect(r.status).toBe(405);
    expect(r.headers.get("allow")).toBe("POST");
  });
});

describe("misc", () => {
  it("large streams the requested byte count", async () => {
    const r = await SELF.fetch(`${BASE}/large?bytes=2048`);
    expect((await r.arrayBuffer()).byteLength).toBe(2048);
  });

  it("echo reflects the body", async () => {
    const r = await SELF.fetch(`${BASE}/echo`, { method: "POST", body: "ping" });
    expect(await r.json()).toMatchObject({ method: "POST", body: "ping" });
  });

  it("set-header sets a custom header", async () => {
    const r = await SELF.fetch(`${BASE}/set-header?name=x-test&value=42`);
    expect(r.headers.get("x-test")).toBe("42");
  });

  it("set-header rejects an invalid header name", async () => {
    const r = await SELF.fetch(`${BASE}/set-header?name=bad%20name&value=1`);
    expect(r.status).toBe(400);
  });

  it("auth basic with non-Latin1 credentials 401s instead of crashing", async () => {
    const r = await SELF.fetch(`${BASE}/auth/basic/${encodeURIComponent("café")}/secret`);
    expect(r.status).toBe(401);
  });

  it("every response carries CORS headers", async () => {
    const r = await SELF.fetch(`${BASE}/status/200`);
    expect(r.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("HEAD has no body but keeps the status", async () => {
    const r = await SELF.fetch(`${BASE}/status/200`, { method: "HEAD" });
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("");
  });

  it("unknown path 404s", async () => {
    const r = await SELF.fetch(`${BASE}/nope`);
    expect(r.status).toBe(404);
  });
});
