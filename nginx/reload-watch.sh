#!/usr/bin/env bash
set -euo pipefail
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
LAST_MTIME=""
while :; do
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
