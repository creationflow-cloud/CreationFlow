# Production SSL/TLS and reverse proxy setup

This stack terminates TLS in front of the CreationFlow apps and keeps the
upstream services on a private Docker network. Traefik v2.11 acts as the
public edge, requesting certificates from Let's Encrypt.

## Topology

```
   Internet
      |
   Traefik :443 (TLS termination, ACME)
      |
   creationflow-internal network
      |
   +--- api:3000      <-- API server
   +--- admin:3002    <-- admin SPA
   +--- editor:3001   <-- editor SPA
   +--- renderer:xxxx  <-- PDF renderer
   +--- worker         <-- background jobs
   +--- postgres, redis
```

The `creationflow` (external) network carries public traffic; the
`creationflow-internal` (external) network is the private backend. Only
Traefik is connected to both. Apps never expose public ports.

## Setup

1. Provision DNS records:

   ```
   api.<DOMAIN>      A <edge>
   admin.<DOMAIN>    A <edge>
   editor.<DOMAIN>   A <edge>
   ```

2. Generate a `.env` next to `docker-compose.yml`:

   ```ini
   ACME_EMAIL=ops@example.com
   DOMAIN=creationflow.example.com
   API_HOST=api.creationflow.example.com
   ADMIN_HOST=admin.creationflow.example.com
   EDITOR_HOST=editor.creationflow.example.com

   CREATIONFLOW_API_KEY=<long-random-secret>
   POSTGRES_PASSWORD=<long-random-secret>
   ```

3. Create both external networks and the Let's Encrypt volume so Traefik
   can persist its ACME account:

   ```bash
   docker network create creationflow
   docker network create creationflow-internal
   docker volume create creationflow-traefik-letsencrypt
   ```

4. Boot the stack plus the proxy overlay:

   ```bash
   docker compose -f deploy/docker/docker-compose.yml \
                  -f deploy/docker/docker-compose.proxy.yml up -d
   ```

5. Validate:

   ```bash
   curl -I https://api.creationflow.example.com/workspaces
   # → 401 (auth required) but TLS handshake is clean
   ```

## Hardening applied in the proxy overlay

- **TLS 1.2+** is enforced per router (`tls.minversion=VersionTLS12`).
- **HSTS** is enabled on the admin and editor labels
  (`stsSeconds=31536000`, `stsIncludeSubdomains=true`,
  `stsPreload=true`).
- **CSP** is applied to admin and editor to restrict script/style/connect
  sources to same-origin plus the API host. The editor additionally
  allows `wss://` for the WebSocket surface introduced in #178.
- **Frame deny** is enabled on the editor to prevent clickjacking
  through the editor.
- **CORS** on the API router allows the admin and editor origins only
  and exposes the headers the apps need (`X-API-Key`, `Authorization`).
- **Rate limiting** averages 200 req/s with a 400 burst to protect the
  API from runaway clients (tune via `RATE_LIMIT` env if you fork this).
- The Traefik container is the only service that publishes ports 80/443;
  every other service stays on the internal network.

## Operational notes

- **Renewals** are managed automatically by Traefik. Check
  `creationflow-traefik-letsencrypt` volume to inspect the ACME state.
- **Logs** are exposed via `docker compose logs -f traefik`; access log
  format includes the routed service, status, and client IP.
- **Hotswap**: to roll a new Traefik version, replace the image tag and
  run `docker compose up -d traefik`. The container will pick up the
  same configuration thanks to the external networks and volume.
- **Stateless**: Traefik can be redeployed at any time; the persistent
  state lives in `creationflow-traefik-letsencrypt`.

## Alternative: nginx

If you prefer nginx, the per-service `admin.nginx.conf` and
`editor.nginx.conf` already implement the same reverse-proxy rules
(header forwarding, gzip, SPA fallback). Drop a TLS terminator in
front and they are ready to serve.
