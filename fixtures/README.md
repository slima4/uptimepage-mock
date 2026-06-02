# Protocol fixtures

TLS-certificate, DNS, and raw-TCP scenarios that a Cloudflare Worker cannot serve. Run on a host with a public IP and inbound 443 / 53 / 9001.

```bash
cd fixtures
docker compose up -d --build
```

## Content encoding (`tls`, port 80)

Served verbatim by nginx (`gzip off`) so the body keeps exactly the `Content-Encoding` set — the Cloudflare Worker cannot, since the edge re-compresses encoded bodies and cannot serve a corrupt one.

| Path | Behaviour |
|------|-----------|
| `/gzip` | valid gzip body, `Content-Encoding: gzip` |
| `/brotli` | valid brotli body, `Content-Encoding: br` |
| `/bad-gzip` | `Content-Encoding: gzip` with garbage → decode failure |

```bash
curl -s --compressed http://HOST/gzip      # -> uptimepage-mock gzip ok
curl -s -H 'Accept-Encoding: gzip' http://HOST/bad-gzip | gzip -dc   # -> decode error
```

## TLS (`tls`, port 443)

nginx serving certs regenerated on every start (so `expiring` is always `EXPIRING_DAYS` from now), selected by SNI. `valid`/`expiring`/`expired`/`wronghost` are signed by a local CA (`/certs/ca.crt` inside the container); `selfsigned` is a standalone self-signed leaf.

| SNI host | Cert | Monitor outcome |
|----------|------|-----------------|
| `valid.tls.mock.uptimepage.dev` | CA-signed, +825 days | cert check Up |
| `expiring.tls.mock.uptimepage.dev` | CA-signed, +`EXPIRING_DAYS` (default 10) | cert check Degraded |
| `expired.tls.mock.uptimepage.dev` | CA-signed, expired 1 day ago | cert check Down |
| `selfsigned.tls.mock.uptimepage.dev` | self-signed (no CA) | HTTPS `verify_tls` failure |
| `wronghost.tls.mock.uptimepage.dev` | CA-signed, SAN mismatch | hostname-mismatch failure |

The cert-expiry check (`TlsCertCheck`) reads the presented cert and works without trusting anything. To test trusted-chain HTTPS (`verify_tls=true`) success against `valid`, import the CA into the monitor's trust store: `docker compose cp tls:/certs/ca.crt ./ca.crt`. Otherwise the whole set is untrusted — for an already-trusted public chain, point checks at [badssl.com](https://badssl.com) or a real domain. This fixture exists for the tunable near-expiry (Degraded) case, which badssl cannot provide.

```bash
echo | openssl s_client -servername expiring.tls.mock.uptimepage.dev \
  -connect HOST:443 2>/dev/null | openssl x509 -noout -enddate
```

## DNS (`dns`, port 53)

CoreDNS authoritative for `dns.mock.uptimepage.dev`. Point the monitor's DNS-check custom resolver at `HOST:53`.

> On most Linux hosts `systemd-resolved` already binds `:53` and `docker compose up` will fail with `address already in use`. Free the port first: set `DNSStubListener=no` in `/etc/systemd/resolved.conf` and `systemctl restart systemd-resolved`, or remap the host port (e.g. `5353:53/udp`) and point the resolver at `HOST:5353`.

| Query | Result |
|-------|--------|
| `dns.mock.uptimepage.dev` A/AAAA/MX/TXT | records present |
| `www.dns.mock.uptimepage.dev` A/AAAA | records present |
| `alias.dns.mock.uptimepage.dev` CNAME | `www.dns...` |
| `absent.dns.mock.uptimepage.dev` | NXDOMAIN |

```bash
dig @HOST -p 53 dns.mock.uptimepage.dev TXT +short
dig @HOST -p 53 absent.dns.mock.uptimepage.dev   # -> NXDOMAIN
```

## TCP (`tcp`, port 9001)

Open echo port — connect succeeds. Probe any other unbound port (e.g. 9002) for a connection-refused case.

```bash
nc -vz HOST 9001   # open
nc -vz HOST 9002   # refused
```

## Domain expiry

Cannot be faked (RDAP against the live registry). Run that check against a real registered domain.
