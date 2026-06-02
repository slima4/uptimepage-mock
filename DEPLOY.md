# Deploy

Two independently deployable parts: the **Worker** (HTTP, Cloudflare edge) and the **fixture stack** (TLS/DNS/TCP, any host with a public IP).

## 1. Worker — secrets

The `deploy-worker.yml` workflow deploys on push to `main` touching `worker/**`. It needs two GitHub repo secrets:

- `CLOUDFLARE_ACCOUNT_ID` — dashboard → Workers & Pages → right sidebar `Account ID` (or `wrangler whoami`).
- `CLOUDFLARE_API_TOKEN` — dashboard → My Profile → API Tokens → Create → template **"Edit Cloudflare Workers"** (covers Workers Scripts:Edit, Account:Read, Zone:Read, Workers Routes:Edit, DNS:Edit).

```bash
gh secret set CLOUDFLARE_API_TOKEN  -R slima4/uptimepage-mock
gh secret set CLOUDFLARE_ACCOUNT_ID -R slima4/uptimepage-mock
```

With these set and the default config, the Worker ships to `https://uptimepage-mock.<your-subdomain>.workers.dev` — no domain setup required.

## 2. Worker — custom domain `mock.uptimepage.dev`

A Workers Custom Domain requires the zone to be Cloudflare-managed. Do **not** move the `uptimepage.dev` apex; delegate only the subdomain.

1. Cloudflare → Add a site → `mock.uptimepage.dev` (a subdomain zone). Cloudflare returns two nameservers.
2. At the current `uptimepage.dev` DNS host, add delegation records:
   ```
   mock.uptimepage.dev.  NS  <cf-ns1>.ns.cloudflare.com.
   mock.uptimepage.dev.  NS  <cf-ns2>.ns.cloudflare.com.
   ```
3. Wait until Cloudflare marks the zone **Active**.
4. Uncomment the route in `worker/wrangler.jsonc`:
   ```jsonc
   "routes": [{ "pattern": "mock.uptimepage.dev", "custom_domain": true }]
   ```
5. Push. The deploy auto-provisions the edge certificate and DNS record. Verify:
   ```bash
   curl -i https://mock.uptimepage.dev/status/503
   ```

Leaving the route active before the zone exists makes every deploy fail, which is why it ships commented out.

## 3. Fixture stack — host

Runs on any host with a public IP and inbound 443 / 53 / 9001 (not Cloudflare). See `fixtures/README.md` for service details.

```bash
cd fixtures
docker compose up -d --build
```

In the Cloudflare `mock` zone, add A records pointing at the fixture host for the TLS SNI names:

```
valid.tls.mock.uptimepage.dev       A  <fixture-ip>
expiring.tls.mock.uptimepage.dev    A  <fixture-ip>
expired.tls.mock.uptimepage.dev     A  <fixture-ip>
selfsigned.tls.mock.uptimepage.dev  A  <fixture-ip>
wronghost.tls.mock.uptimepage.dev   A  <fixture-ip>
```

The DNS check points its custom resolver directly at `<fixture-ip>:53`, so `dns.mock.uptimepage.dev` needs no delegation. On Linux, free port 53 from `systemd-resolved` first (see `fixtures/README.md`).
