# ParsianStore API — production image.
#
#   docker build -f apps/api/Dockerfile -t parsianstore-api .
#
# BUILD CONTEXT IS THE REPOSITORY ROOT, not apps/api. `packages/schemas` is a
# real workspace dependency of this app (`"schemas": "workspace:*"`), it emits
# JavaScript to `dist/`, and the app imports subpaths off its `exports` map
# (`schemas/fa-text`, `schemas/catalog-systems`, `schemas/vehicle-key`). So
# schemas must be BUILT BEFORE the api is compiled, and its `dist/` has to be
# present in the runtime image. A context rooted at apps/api cannot see it.
#
# WHY bookworm-slim AND NOT alpine: `argon2` is a native addon that ships
# prebuilt binaries per platform (prebuilds/linux-x64 is glibc, there is no
# musl build in the package), and `sharp` resolves its own platform binary
# through optional dependencies. glibc is the combination the lockfile
# actually describes.
#
# WHY THERE IS NO PRISMA ENGINE BINARY TO WORRY ABOUT: Prisma 7 with a driver
# adapter (`@prisma/adapter-pg`) runs the query compiler as WebAssembly
# (`.prisma/client/query_compiler_fast_bg.wasm`) — architecture-independent,
# nothing to download at runtime. `prisma migrate deploy` is the exception: it
# needs the platform `schema-engine` binary from `@prisma/engines`, which is
# why migrations run from their own stage (`ops`) and not from the slim
# runtime image.

# --------------------------------------------------------------- base ------
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=true
# The version is pinned by the root package.json's `packageManager` field;
# corepack reads it from there, so it can never drift from what CI uses.
RUN corepack enable
WORKDIR /app

# ------------------------------------------------------------- builder -----
# Full install (dev dependencies included — tsc and the Prisma CLI live there),
# then build schemas and compile the api to dist/.
FROM base AS builder

# Manifests first so the install layer is cached independently of source edits.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY patches ./patches
COPY apps/api/package.json ./apps/api/
COPY packages/schemas/package.json ./packages/schemas/
# apps/api's `postinstall` is `prisma generate`, which runs during the install
# below and needs the schema and prisma.config.ts to already be here. The
# alternative — `--ignore-scripts` — would also skip @prisma/engines' script,
# and that is the one that fetches the platform `schema-engine` binary the
# `ops` stage runs `migrate deploy` with.
COPY apps/api/prisma.config.ts ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
# `--filter api...` = the api plus everything it depends on (packages/schemas),
# and nothing else. apps/web's dependency tree has no business in this image.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter api...

COPY tsconfig.base.json ./
COPY packages/schemas ./packages/schemas
COPY apps/api ./apps/api

# Order matters: schemas emits dist/, and the api's `tsc` resolves
# "schemas/fa-text" & friends against that emitted output.
RUN pnpm --filter schemas build \
 && pnpm --filter api build

# ------------------------------------------------------------- deploy ------
# A self-contained, production-only dependency tree for the api alone.
# `pnpm deploy` resolves the workspace links (schemas is copied in, not
# symlinked out of the monorepo) and `--prod` drops every dev dependency.
#
# `--ignore-scripts` is required, not cosmetic: apps/api's `postinstall` is
# `prisma generate`, and the Prisma CLI is a dev dependency that `--prod`
# has just excluded — the script would fail. The client is generated into the
# deployed tree on the next line instead, using the builder's CLI.
#
# `prisma.config.ts` is deleted BEFORE generate rather than after: the CLI
# auto-loads it from the working directory, and it `import`s `prisma/config` —
# from the CLI package that `--prod` just removed. Passing `--schema` gives
# generate everything the config file would have told it. The generated client
# lands in /prod/node_modules/.prisma/client because that is where the
# resolver finds `@prisma/client` walking up from the schema.
FROM builder AS deploy
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter api deploy --prod --ignore-scripts /prod \
 && rm -f /prod/prisma.config.ts \
 && node /app/apps/api/node_modules/prisma/build/index.js generate \
      --schema /prod/prisma/schema.prisma \
 && rm -rf /prod/src /prod/prisma /prod/tsconfig.json /prod/vitest.config.ts /prod/test-results

# ----------------------------------------------------------------- ops -----
# The one-shot operations image: `prisma migrate deploy` and the `seed:*`
# scripts. Kept apart from the runtime image on purpose — it carries the
# Prisma CLI, its platform schema-engine binary, `tsx` and the TypeScript
# sources, none of which belong in the container that serves traffic. It is
# never left running: compose starts it, it does its job, it exits.
#
# WHY THE SEEDS NEED THE SOURCES. `apps/api/package.json` runs every seed as
# `tsx src/seed/<name>.ts` — they are TypeScript, not part of the compiled
# `dist`, and there is no `seed` entry in the built output to call instead.
# So this stage keeps src/, the workspace's built `packages/schemas`, and the
# one data file a seed reads from outside its own package
# (`seed:visual-catalog` parses apps/web/public/products/digikala.csv).
#
# cwd is the api package root: prisma.config.ts resolves
# `prisma/schema.prisma` and `prisma/migrations` relative to it, and so do the
# `pnpm --filter api seed:*` scripts.
FROM base AS ops
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/schemas ./packages/schemas
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json /app/apps/api/prisma.config.ts /app/apps/api/tsconfig.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY --from=builder /app/tsconfig.base.json ./
COPY apps/web/public/products/digikala.csv ./apps/web/public/products/digikala.csv

# Bake pnpm in, so `pnpm seed:catalog` works exactly as it does locally and
# works OFFLINE. `corepack enable` only installs shims; the package manager
# itself is downloaded on first use, which for a one-shot container means a
# download on every single run and a hard failure on a host with no registry
# access. `corepack prepare --activate` with no version argument resolves the
# root package.json's `packageManager` field, so this can never drift from
# the version CI and the developers use. COREPACK_HOME is moved out of root's
# home and made world-readable because the container runs as `node`.
ENV COREPACK_HOME=/opt/corepack
RUN corepack prepare --activate && chmod -R a+rX /opt/corepack

WORKDIR /app/apps/api
USER node
# ENTRYPOINT is pnpm and CMD is a script name from apps/api/package.json, so
# every one-shot task is the script an engineer already knows:
#
#   docker compose ... up migrate                  -> pnpm db:deploy
#   docker compose ... run --rm migrate seed:catalog -> pnpm seed:catalog
#   docker compose ... run --rm migrate seed:staff   -> pnpm seed:staff
#
# `db:deploy` is `prisma migrate deploy` (apps/api/package.json). Deliberately
# not `db:migrate` — that is `migrate dev`, which is interactive, can reset the
# database, and writes new migration files.
ENTRYPOINT ["pnpm"]
CMD ["db:deploy"]

# -------------------------------------------------------------- runner -----
FROM base AS runner
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app

COPY --from=deploy --chown=node:node /prod/node_modules ./node_modules
COPY --from=deploy --chown=node:node /prod/package.json ./package.json
COPY --from=builder --chown=node:node /app/apps/api/dist ./dist

# LocalDiskStorageProvider writes here (apps/api/src/providers/storage/index.ts
# resolves `../../../uploads` from its own compiled location, i.e. /app/uploads).
# Created up front and owned by `node` so the container can write to it even
# when no volume is mounted over it.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node
EXPOSE 4000
# No shell form, so the process is PID 1 and receives SIGTERM directly —
# src/server.ts installs a SIGTERM handler and drains connections on it.
CMD ["node", "dist/server.js"]
