#!/usr/bin/env bash
set -euo pipefail

: "${DOMAIN:?DOMAIN must be set}"

# Render templates
mkdir -p /etc/nginx/conf.d /var/www/certbot
envsubst < /etc/nginx/templates/app.conf.template > /etc/nginx/conf.d/app.conf

# Launch nginx and background a cert reload watcher
nginx -g 'daemon off;' &
/reload-watch.sh &
wait -n
