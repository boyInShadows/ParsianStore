# ParsianStore storefront — production image.
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.ir \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://example.ir \
#     -t parsianstore-web .
#
# BUILD CONTEXT IS THE REPOSITORY ROOT, not apps/web — `packages/schemas` is a
# workspace dependency and its `exports` map points at `dist/`, so it has to be
# built before `next build` runs.
#
# THE BUILD ARGS ARE NOT OPTIONAL POLISH. `NEXT_PUBLIC_*` values are inlined
# into the client bundle at build time (turbo.json says the same thing about
# its cache key). An image built without them ships a storefront whose browser
# code calls `undefined/api/v1/...`, and setting the variable at `docker run`
# time cannot fix it — the string is already compiled in. Rebuild the image
# when the public URLs change.

# --------------------------------------------------------------- base ------
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=true
RUN corepack enable
WORKDIR /app

# ------------------------------------------------------------- builder -----
FROM base AS builder

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# `pnpm.patchedDependencies` patches `next` itself — without patches/ the
# install fails outright rather than silently skipping the patch.
COPY patches ./patches
COPY apps/web/package.json ./apps/web/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/config/package.json ./packages/config/
# `--filter web...` pulls in packages/schemas and leaves apps/api's tree out.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter web...

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_DEFAULT_LOCALE=fa
ARG NEXT_PUBLIC_ENAMAD_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_DEFAULT_LOCALE=$NEXT_PUBLIC_DEFAULT_LOCALE \
    NEXT_PUBLIC_ENAMAD_ID=$NEXT_PUBLIC_ENAMAD_ID \
    NEXT_OUTPUT_STANDALONE=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN pnpm --filter schemas build \
 && pnpm --filter web build

# -------------------------------------------------------------- runner -----
# `.next/standalone` already contains a `server.js` and the traced subset of
# node_modules, so this stage installs nothing at all. The two directories
# Next deliberately leaves out of it — `.next/static` and `public` — are
# copied alongside, at the paths server.js expects.
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# Tracing root is the monorepo root, so standalone mirrors the workspace
# layout: the server entrypoint lands at apps/web/server.js with
# node_modules/ hoisted beside it.
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
# HOSTNAME=0.0.0.0 above is what makes the server listen on the container's
# interface rather than only on its loopback, where a published port reaches
# nothing.
CMD ["node", "apps/web/server.js"]
