# syntax=docker/dockerfile:1.7
#
# FinPilot web (Next.js standalone). Build context: apps/web
#   docker build --build-arg API_INTERNAL_URL=http://api:8000 -t finpilot-web apps/web
#
# API_INTERNAL_URL is where the Next.js server proxies /api/* (same-origin for the browser,
# so the HttpOnly session cookie needs no CORS). Rewrites are resolved at build time in
# standalone output, so it is a build ARG and is also exported at runtime.

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ARG API_INTERNAL_URL=http://api:8000
ENV API_INTERNAL_URL=${API_INTERNAL_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `public/` is optional in Next.js; guarantee it exists for the COPY below.
RUN mkdir -p public && npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ARG API_INTERNAL_URL=http://api:8000
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    API_INTERNAL_URL=${API_INTERNAL_URL}

RUN addgroup -S -g 10001 finpilot && adduser -S -u 10001 -G finpilot finpilot
COPY --from=build --chown=finpilot:finpilot /app/.next/standalone ./
COPY --from=build --chown=finpilot:finpilot /app/.next/static ./.next/static
COPY --from=build --chown=finpilot:finpilot /app/public ./public

USER finpilot
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
