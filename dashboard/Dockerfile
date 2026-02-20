FROM oven/bun:1.3.5 AS builder
WORKDIR /app

# Copy workspace manifests for layer caching
COPY tsconfig.base.json ./
COPY tsconfig.json ./
COPY package.json bun.lock ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/

# Install from root so workspace:* links resolve
RUN bun install --frozen-lockfile

# Copy source
COPY shared ./shared
COPY dashboard ./dashboard

WORKDIR /app/dashboard
RUN bun run build

FROM busybox:uclibc
COPY --from=builder /app/dashboard/dist /www

# Redirect 404s to index.html for SPA routing
RUN echo -e 'E404:index.html' > /www/httpd.conf

EXPOSE 8080
CMD ["busybox", "httpd", "-f", "-p", "8080", "-h", "/www"]
