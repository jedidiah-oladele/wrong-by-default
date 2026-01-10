# Stage 1: Build the application
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_BACKEND_API_BASE_URL
ARG VITE_BACKEND_API_KEY
ARG ENV=production

# Set as environment variables for Vite build
ENV VITE_BACKEND_API_BASE_URL=${VITE_BACKEND_API_BASE_URL}
ENV VITE_BACKEND_API_KEY=${VITE_BACKEND_API_KEY}
ENV ENV=${ENV}

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
# Debug: Print environment variables (remove in production if sensitive)
RUN echo "Building with VITE_BACKEND_API_BASE_URL=${VITE_BACKEND_API_BASE_URL:-not set}"
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Verify build output exists
RUN ls -la /usr/share/nginx/html || (echo "ERROR: Build output not found" && exit 1)

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy startup script
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh

# Expose port (Cloud Run will set PORT environment variable)
ENV PORT=8080
EXPOSE 8080

# Start nginx
CMD ["/start-nginx.sh"]
