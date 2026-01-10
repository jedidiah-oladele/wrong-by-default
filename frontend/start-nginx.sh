#!/bin/sh
# Replace PORT placeholder in nginx config with actual PORT from environment
export PORT=${PORT:-8080}
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
