#!/usr/bin/env bash
set -euo pipefail

: "${DOMAIN:?DOMAIN must be set}"

# Render templates
mkdir -p /etc/nginx/conf.d /var/www/certbot

# Check if certificates exist, use fallback config if not
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "Certificates not found, using fallback HTTP config"
  cp /etc/nginx/templates/fallback.conf /etc/nginx/conf.d/app.conf
else
  echo "Certificates found, using HTTPS config"
  envsubst < /etc/nginx/templates/app.conf.template > /etc/nginx/conf.d/app.conf
fi

# Launch nginx and background a cert reload watcher
nginx -g 'daemon off;' &
/reload-watch.sh &
wait -n
