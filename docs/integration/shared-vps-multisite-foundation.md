# Shared VPS site foundation — 28 October 2026

## Current routing

The Ubuntu host's `nginx` service is inactive. Docker container `jvd_nginx`
owns public ports 80 and 443 and loads its configuration from
`/opt/jvd/JVD-Internal-Management-System/backend/docker/nginx.conf`.

- `srv1857115.hstgr.cloud` belongs to PULSO. Its two exact-name virtual hosts
  live in `backend/docker/pulso-edge/site.conf` and proxy to `pulso-web`.
- Requests without a more specific hostname use JVD's existing default site.
- Both `jvd_nginx` and `pulso-web` are on the external Docker network
  `pulso_edge`. JVD's production Compose file declares that network for its
  Nginx service, so Compose recreations preserve the connection. Their
  application databases are not on that edge network.
- A separate internal Docker network, `agorsync_edge`, is reserved for
  AGORsync's web-facing container and the shared `jvd_nginx` proxy. PULSO
  containers do not join it. The AGORsync database belongs on its own private
  application network, not either edge network. If AGORsync needs outbound
  provider access, give it a separate egress network; `agorsync_edge` is
  internal.
- The PULSO hostname is already registered for Google OAuth, Maps, reCAPTCHA,
  Search Console, and HTTPS. Keep it assigned to PULSO.

An empty, generic `backend/docker/edge-sites/` include is installed for future
websites. Files ending in `.conf` there are live Nginx configuration. Templates
with `.template` extensions are not loaded. The new include itself has no route
for AGORsync because it has no separate hostname yet.

## Add AGORsync when it has a domain

1. Choose one domain or subdomain under the control of the AGORsync owner.
   Point its A record to `187.77.136.42` and verify DNS resolution. Do not
   reuse `srv1857115.hstgr.cloud` or JVD's IP/default host.
2. Deploy AGORsync's web service without publishing ports 80 or 443. Connect
   only its web-facing container to `agorsync_edge`; keep its database on its
   own private application network. Do not attach AGORsync containers to
   `pulso_edge`. Give the web service a stable Docker DNS alias and internal
   port. The AGORsync developers must supply its app-specific headers, health
   route, websocket, uploads, and base-URL requirements.
3. Start with the [HTTP ACME template](../../output/deployment/edge-site-http.conf.template),
   replacing `__HOSTNAME__` with the chosen exact hostname. Install it as
   `backend/docker/edge-sites/agorsync.conf`. It serves only certificate
   challenges and returns 503 for the app until HTTPS is ready. Run
   `docker exec jvd_nginx nginx -t` and reload only after validation.
4. Obtain a certificate using the existing Certbot webroot and certificate
   directory at `backend/docker/pulso-edge/{acme,certificates}`. Do not run
   `certbot --nginx` on the host: the host has no public Nginx service. The
   existing `pulso-cert-renew.timer` renews certificates in that shared store.
5. Replace the temporary file with the [HTTPS template](../../output/deployment/edge-site-https.conf.template),
   substituting the exact hostname and the AGORsync web container's DNS alias
   and port. Validate with `docker exec jvd_nginx nginx -t`, reload, and test
   AGORsync over HTTPS. Test PULSO and JVD after every proxy change.

Run `/opt/pulso/bin/edge-preflight.sh` before and after a shared proxy change.
It checks Nginx syntax, duplicate claims on PULSO's hostname, both edge-network
memberships, container health, PULSO's public routes and Search Console file,
and JVD's IP site. The script does not change Nginx or application state.

Do not start a second host Nginx/Apache or bind another container directly to
host ports 80/443. Preserve `edge-sites/`, the include, and both external edge
network declarations when updating the JVD checkout. Recreate `jvd_nginx` with
JVD's updated production Compose file, which attaches both networks. Root-only
backups of the pre-foundation Nginx and Compose files are under
`/opt/pulso/shared`.

The network boundary was tested with a temporary web container on
`agorsync_edge`: `jvd_nginx` could fetch it and `pulso-web-1` could not. The
temporary container was removed afterward; no AGORsync application is active.

## Acceptance check for a new site

- The new hostname resolves to the VPS and presents its own valid certificate.
- The new hostname serves AGORsync; `srv1857115.hstgr.cloud` still serves PULSO.
- `http://187.77.136.42/` still serves JVD.
- `/opt/pulso/bin/edge-preflight.sh` exits successfully.
- A container restart and certificate renewal check preserve all three routes.
