# syntax=docker/dockerfile:1

# ---- deps: install everything (incl. dev) for the build ---------------------
FROM node:22-alpine AS deps
WORKDIR /app
# build tools only matter if a native module has no prebuilt binary for this platform
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile the SvelteKit app, then drop dev dependencies -----------
FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime: small image, non-root user ------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk upgrade --no-cache \
 && apk add --no-cache tzdata \
 && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn* \
 && addgroup -S -g 10001 app \
 && adduser -S -u 10001 -G app app \
 && mkdir -p /data \
 && chown app:app /data

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    TZ=Europe/Sofia \
    DATABASE_PATH=/data/app.db \
    MIGRATIONS_DIR=/app/drizzle \
    BODY_SIZE_LIMIT=20M

COPY --from=build --chown=app:app /app/package.json ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/drizzle ./drizzle
COPY --from=build --chown=app:app /app/build ./build

# /data is owned by the app user, so a fresh volume mounted here is writable.
USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

# Migrations run automatically when the server starts (SvelteKit `init` hook).
CMD ["node", "build"]
