#!/bin/sh
set -e

# Replace PORT placeholder in nginx config with actual PORT from environment
export PORT=${PORT:-8080}
echo "Starting nginx on port ${PORT}"

# Ensure conf.d directory exists
mkdir -p /etc/nginx/conf.d

# Generate nginx config
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Verify the config was created
if [ ! -f /etc/nginx/conf.d/default.conf ]; then
    echo "ERROR: Failed to create nginx config"
    exit 1
fi

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'
