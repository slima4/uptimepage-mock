# uptimepage-mock

Deterministic mock endpoints for testing uptime monitors. Two parts:

- **`worker/`** — a Cloudflare Worker serving the full HTTP/HTTPS scenario matrix at `mock.uptimepage.dev`. Free, edge-hosted, no rate limits you don't control.
- **`fixtures/`** — a Docker stack for the protocol-level scenarios a Worker physically cannot produce: TLS-certificate edge cases, raw-TCP, and DNS.

Public services like httpbin and httpstat.us drift, rate-limit, and go down. This repo is the owned, deterministic alternative for end-to-end monitor testing.

## Worker (HTTP)

```bash
cd worker
pnpm install
pnpm gen        # regenerate the precompressed brotli payload
pnpm test       # vitest on the real workerd runtime
pnpm dev        # local server at http://127.0.0.1:8787
pnpm deploy     # deploy (needs Cloudflare credentials)
```

### Endpoints

| Endpoint | Behaviour |
|----------|-----------|
| `/status/:code` | exact status code |
| `/status/:a,:b,:c` | random one-of the listed codes |
| `/status/:code?body=TEXT` | status with a body string |
| `/body?text=TEXT` | 200 with the given body (drive keyword match) |
| `/large?bytes=N` | stream N bytes (test body-size caps) |
| `/redirect/:n` | chain of n hops, terminating in 200 |
| `/redirect-to?url=ABS&status=30x` | single redirect (301/302/303/307/308) |
| `/delay/:secs` | wait 0–30s then 200 |
| `/slow-body/:secs` | fast headers, trickled body (body timeout) |
| `/auth/basic/:user/:pass` | HTTP basic auth challenge |
| `/auth/bearer/:token` | bearer token challenge |
| `/retry-after/:code?seconds=N&date=1` | 429/503 with `Retry-After` |
| `/method` · `/method/:verb` | reflect method · require method (else 405) |
| `/echo` | reflect method, headers, body |
| `/headers` | echo request headers |
| `/set-header?name=X&value=Y` | set arbitrary response headers (repeatable) |
| `/flap?period=N` | alternate up/down every N seconds |
| `/cors` | CORS marker (CORS headers are on every response) |
| `/` | HTML index |

Content-encoding endpoints (`/gzip`, `/brotli`, `/bad-gzip`) are **not** on the Worker — the Cloudflare edge re-compresses encoded bodies (double-encoding them) and cannot serve a deliberately corrupt one. They live in the fixture stack, served verbatim by nginx. See [`fixtures/README.md`](fixtures/README.md).

### Smoke check

```bash
BASE=https://mock.uptimepage.dev
curl -i $BASE/status/503
curl -i $BASE/redirect/3
curl -i "$BASE/retry-after/429?seconds=30"
curl -i $BASE/bad-gzip
curl -i "$BASE/delay/5"
```

## Fixtures (TLS / TCP / DNS)

A Worker only speaks HTTP, so these run as a Docker stack on a host with a public IP and open ports. See `fixtures/` (added in phase 2).

- **TLS cert** — nginx serving openssl-generated certs per SNI host: `valid` (→ up), `expiring` (within the warn/critical window → degraded, the case [badssl.com](https://badssl.com) can't give), `expired` (→ down), `selfsigned`, `wronghost`. For the standard valid/expired/self-signed/wrong-host cases, point checks at [badssl.com](https://badssl.com) directly.
- **TCP** — an open echo port (connect ok) plus any unbound port (connection refused).
- **DNS** — CoreDNS authoritative for a delegated sub-zone with A/AAAA/CNAME/MX/TXT records and a guaranteed `NXDOMAIN` name; point the monitor's custom resolver at it.
- **Domain expiry** — cannot be faked; run that check against a real registered domain.

## Deploy

See [DEPLOY.md](DEPLOY.md). In short: set the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets and the Worker ships to `*.workers.dev` on push; the `mock.uptimepage.dev` custom domain and the fixture host are opt-in follow-ups.
