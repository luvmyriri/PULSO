#!/usr/bin/env bash
set -euo pipefail
edge=/opt/jvd/JVD-Internal-Management-System/backend/docker/pulso-edge
docker run --rm -v "$edge/acme:/var/www/acme" -v "$edge/certificates:/etc/letsencrypt" certbot/certbot renew --webroot -w /var/www/acme --quiet
docker exec jvd_nginx nginx -t
docker exec jvd_nginx nginx -s reload
