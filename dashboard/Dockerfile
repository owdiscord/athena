FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace manifests for layer caching
COPY tsconfig.base.json ./
COPY tsconfig.json ./
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/

# Install from root so workspace:* links resolve
RUN pnpm install --frozen-lockfile

# Copy sources
COPY shared ./shared
COPY dashboard ./dashboard

# Build dashboard SPA
WORKDIR /app/dashboard
RUN pnpm run build

# Copy the built files out to a volume
CMD ["sh", "-c", "rm -rf /dist/* && cp -r /app/dashboard/dist/* /dist/"]

#
## Unused runtime image, we now just export the build into a volume.
#
# Runtime image
# FROM busybox:musl
#
# # Document root for httpd
# WORKDIR /var/www/app
#
# COPY --from=builder /app/dashboard/dist ./
#
# # BusyBox httpd config for SPA fallback
# RUN printf "E404:index.html\n" > /etc/httpd.conf
#
# EXPOSE 8080
#
# CMD ["busybox", "httpd", "-f", "-p", "0.0.0.0:8080", "-h", "/var/www/app", "-c", "/etc/httpd.conf"]
