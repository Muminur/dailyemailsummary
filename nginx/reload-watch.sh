#!/usr/bin/env bash
set -euo pipefail
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
LAST_MTIME=""

# Function to reload nginx config if certs exist
reload_config_if_needed() {
  if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ ! -f "/tmp/nginx_https_enabled" ]; then
    echo "[reload-watch] Certificates now available, switching to HTTPS config"
    envsubst < /etc/nginx/templates/app.conf.template > /etc/nginx/conf.d/app.conf
    nginx -s reload || true
    touch /tmp/nginx_https_enabled
  fi
}

while :; do
  reload_config_if_needed
  
  if [ -d "$CERT_DIR" ]; then
    MTIME=$(find "$CERT_DIR" -type f -maxdepth 1 -printf '%T@\n' 2>/dev/null | sort -n | tail -n1 || echo "")
    if [ -n "$MTIME" ] && [ "$MTIME" != "$LAST_MTIME" ]; then
      echo "[reload-watch] Detected certificate change, reloading nginx"
      nginx -s reload || true
      LAST_MTIME="$MTIME"
    fi
  fi
  sleep 300
done