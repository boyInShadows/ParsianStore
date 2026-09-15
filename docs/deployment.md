# Deploying ParsianStore

For an operator who has a Linux VPS with Docker on it and a git clone of this
repository, and nothing else. Every command here was run against this stack
before it was written down; the output shown is real output, trimmed.

Development is a different thing entirely and is not affected by anything in
this document — `pnpm dev` still starts `compose.yaml`'s Postgres on
`127.0.0.1:5433`. The two stacks share no container, no network and no volume.

---

## 0. What you are deploying

```
                  the VPS
  ┌───────────────────────────────────────────────┐
  │  reverse proxy (nginx / Caddy)  :80 :443      │  ← you provide this
  │        │                    │                 │
  │        ▼                    ▼                 │
  │  127.0.0.1:3000       127.0.0.1:4000          │
  │  ┌──────────┐         ┌──────────┐            │
  │  │   web    │────────▶│   api    │            │
  │  │ Next 15  │         │ Express  │            │
  │  └──────────┘         └────┬─────┘            │
  │                            │ postgres:5432    │
  │                       ┌────▼─────┐            │
  │                       │ postgres │  NO PORT   │
  │                       │    18    │  PUBLISHED │
  │                       └────┬─────┘            │
  │                            │                  │
  │            volume parsianstore-prod_postgres-data
  └───────────────────────────────────────────────┘
```

Four compose services in `compose.prod.yaml`:

| Service    | What it is                          | Published port        |
| ---------- | ----------------------------------- | --------------------- |
| `postgres` | PostgreSQL 18, the only database    | **none, deliberately**|
| `migrate`  | one-shot; applies migrations, exits | none                  |
| `api`      | Express 5 API                       | `127.0.0.1:4000`      |
| `web`      | Next.js storefront + admin          | `127.0.0.1:3000`      |

Both published ports bind to loopback, so nothing is reachable from the
internet until you put a reverse proxy in front of them and terminate TLS
there. That is the intended shape; see §6.

---

## 1. Prerequisites

- A Linux VPS. 2 vCPU and 4 GB RAM is comfortable. **Building the storefront
  image is the memory-hungry step** — `next build` compiles the whole app. On
  a 2 GB box add swap before you build, or build the images elsewhere and push
  them to a registry.
- Docker Engine with the Compose v2 plugin. Check both:

  ```bash
  docker --version          # Docker version 29.7.2 or similar
  docker compose version    # Docker Compose version v2.x — "compose" not "docker-compose"
  ```

- The repository, cloned somewhere the deploying user owns:

  ```bash
  git clone <repo-url> parsian-store
  cd parsian-store
  git checkout development      # or the release tag you intend to run
  ```

You do **not** need Node, pnpm, or PostgreSQL installed on the VPS. Everything
runs inside containers; the images build their own toolchain.

---

## 2. One-time setup: the environment file

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

`.env.production` is matched by `.gitignore`'s `.env.*` rule. It never gets
committed, and nothing in this repository ever reads a real secret from a
tracked file.

Generate the secrets — do not invent them by hand:

```bash
# database password (avoid a value containing @ : / ? # [ ] % — it goes into a URL)
openssl rand -base64 24 | tr -d '/+=' | cut -c1-24

# the two JWT secrets; they must differ from each other and be ≥ 32 characters
openssl rand -hex 32
openssl rand -hex 32
```

Then edit `.env.production` and fill in, at minimum:

| Variable                             | Notes                                                                |
| ------------------------------------ | -------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                  | from the command above                                               |
| `DATABASE_URL`                       | same password, host **`postgres`**, port **5432**, db `parsian_store` |
| `JWT_ACCESS_SECRET`                  | ≥ 32 chars                                                           |
| `JWT_REFRESH_SECRET`                 | ≥ 32 chars, different from the access secret                          |
| `NEXT_PUBLIC_SITE_URL`               | `https://your-domain.ir` — **build-time**                            |
| `NEXT_PUBLIC_API_URL`                | `https://api.your-domain.ir` — **build-time**                        |
| `PUBLIC_URL`                         | same as `NEXT_PUBLIC_API_URL`                                        |
| `CORS_ORIGINS`                       | the site URL, **first**                                              |
| `ADMIN_SEED_PHONE`                   | the mobile number that becomes superadmin                            |

`DATABASE_URL`'s host is `postgres` — the compose service name — because the
API reaches the database over the stack's internal network. `localhost` there
means "inside the api container", where nothing is listening, and `5433` is
development's published port and does not exist here.

Every command below passes the file explicitly. Define this once per shell and
the rest of the document is copy-pasteable:

```bash
alias dc='docker compose --env-file .env.production -f compose.prod.yaml'
```

**If a required variable is missing, compose refuses to do anything at all** —
it does not start half a stack:

```
$ docker compose -f compose.prod.yaml config
error while interpolating services.api.environment.DATABASE_URL: required variable
  DATABASE_URL is missing a value: DATABASE_URL is required
error while interpolating services.api.environment.JWT_ACCESS_SECRET: required variable
  JWT_ACCESS_SECRET is missing a value: JWT_ACCESS_SECRET is required - at least 32 characters
```

That is the check working. Add the variable, or the `--env-file`.

---

## 3. First deploy

```bash
dc config --quiet            # parses everything, prints nothing, exits 0 if the file is complete
dc up -d --build
```

The first build takes several minutes: it installs the workspace twice (once
per image), builds `packages/schemas`, compiles the API with `tsc`, and runs
`next build`.

Compose then starts things in a fixed order, and each step waits for the one
before it:

```
 Container parsianstore-prod-postgres-1  Healthy
 Container parsianstore-prod-migrate-1   Started
 Container parsianstore-prod-migrate-1   Exited
 Container parsianstore-prod-api-1       Started
 Container parsianstore-prod-api-1       Healthy
 Container parsianstore-prod-web-1       Started
```

`migrate` is the one-shot that applies the schema. It exits 0 and stays
exited — that is success, not a crash. Its log:

```
$ dc logs migrate
Applying migration `20260827055133_init`
...
The following migration(s) have been applied:
migrations/
  └─ 20260827055133_init/
  ...
All migrations have been successfully applied.
```

It runs `prisma migrate deploy` and nothing else. It never runs `db push`
(which rewrites the database to match the model file and can drop a column
with no migration behind it), and it never seeds. Seeding is §4, by hand, on
purpose.

### 3.1 The database is empty at this point

A fresh deploy has a schema and no rows: no provinces, no vehicles, no
products, no staff account. The API is healthy and answers correctly — with
nothing in it:

```
$ curl -s localhost:4000/api/v1/catalog/products?limit=2
{"ok":true,"data":[],"meta":{"nextCursor":null,"limit":2}}
```

---

## 4. Seeding, deliberately

Seeds run through the same one-shot `migrate` service, which is built from the
API image's `ops` target: it carries the Prisma CLI, `tsx`, pnpm and the
TypeScript sources, none of which exist in the container that serves traffic.
`docker compose run --rm` starts one, runs one script, and throws the
container away.

The command is the same `pnpm` script name used locally
(`pnpm --filter api seed:catalog` → `dc run --rm migrate seed:catalog`).

**Order matters.** Run them in this order on a fresh database:

```bash
dc run --rm migrate seed:geo        # 31 provinces, 112 cities
dc run --rm migrate seed:vehicles   # Saipa + Iran Khodro makes/models/generations/engines
dc run --rm migrate seed:catalog    # categories, brands, products, fitments
dc run --rm migrate seed:shipping   # the weight/price ladder behind shipping estimates
dc run --rm migrate seed:staff      # the superadmin — reads ADMIN_SEED_PHONE
```

Real output from each:

```
{"level":30,...,"provinces":31,"cities":112,"msg":"Geo seed complete"}
{"level":30,...,"makes":2,"models":23,"generations":31,"engines":41,"msg":"Vehicle seed complete"}
{"level":30,...,"products":320,"fitments":320,"categories":10,"brands":15,"msg":"Catalog seed complete"}
{"level":30,...,"rates":25,"msg":"Shipping rate seed complete"}
{"level":30,...,"phone":"+98...","msg":"Staff seed: superadmin created"}
```

Notes:

- `seed:catalog` re-runs `seed:vehicles` itself (it needs the fitment targets),
  so running vehicles first is belt-and-braces, not a requirement.
- The seeds are idempotent: running one twice does not duplicate rows.
- `seed:staff` fails with a validation error if `ADMIN_SEED_PHONE` is empty.
  It takes an Iranian mobile number, e.g. `09121234567`, and normalises it to
  `+98…`. That number is then the one you sign into `/admin` with.
- `seed:visual-catalog` also exists. It is the temporary image-backed
  demonstration catalogue built from `apps/web/public/products/digikala.csv`
  (README, "Optional local tooling"), not production data. The CSV is in the
  ops image if you want it, but do not run it on a real shop.

### 4.1 Signing in as the superadmin

Sign-in is by one-time password over SMS. With the default `SMS_PROVIDER=mock`
**no SMS is sent** — the OTP is written to the API log instead:

```bash
dc logs -f api | grep -i otp
```

That is workable for the first login and is **not** acceptable once real
customers sign in. Set `SMS_PROVIDER=kavenegar` with a real
`KAVENEGAR_API_KEY` and `OTP_TEMPLATE` before launch, and restart the api.
`PAYMENT_PROVIDER=mock` carries the same warning: it marks orders paid without
any money moving.

---

## 5. Verifying the deploy actually worked

Run all six. Each one has an expected output; anything else means stop and
read §10.

**1 — every container is up, and postgres publishes no port**

```
$ dc ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'
NAME                           STATUS                   PORTS
parsianstore-prod-api-1        Up 14 seconds (healthy)  127.0.0.1:4000->4000/tcp
parsianstore-prod-postgres-1   Up 40 seconds (healthy)  5432/tcp
parsianstore-prod-web-1        Up 8 seconds (healthy)   127.0.0.1:3000->3000/tcp
```

`5432/tcp` with **nothing before the arrow** is the point: the port exists
inside the container and is not mapped to the host. If you ever see
`0.0.0.0:5432->5432/tcp` there, your database is on the internet — stop and
fix it.

**2 — the API answers**

```
$ curl -s localhost:4000/api/v1/health
{"ok":true,"data":{"status":"up"}}
```

**3 — the API answers *from the database*** (after seeding)

```
$ curl -s 'localhost:4000/api/v1/catalog/products?limit=2' | head -c 120
{"ok":true,"data":[{"id":"01a0a71e-583b-75af-84ef-5767a030545b","name":{"fa":"گریس یاتاقان","en":"Bearing Grease"...
```

**4 — the storefront renders, in Persian, right-to-left**

```
$ curl -s localhost:3000/ | grep -o '<title>[^<]*</title>'
<title>قطعات اصلی خودروهای سایپا و ایران‌خودرو | پارسیان</title>

$ curl -s localhost:3000/ | grep -o 'dir="rtl"'
dir="rtl"
```

`/` is the Persian storefront: `fa` is the default locale and is served
unprefixed, so `/fa` redirects to `/` with a 307. That redirect is correct
behaviour, not a misconfiguration.

**5 — the storefront is really talking to the API** (after seeding)

```
$ curl -s localhost:3000/c/engine -o /tmp/c.html -w '%{http_code}\n'
200
$ grep -o 'فیلتر' /tmp/c.html | wc -l
11
```

Server-rendered product names from the seeded catalogue. A 200 with zero
product names means the web container cannot reach the api — check
`dc logs web`.

**6 — there is exactly one database, and it is not a test one**

```
$ dc exec -T postgres psql -U parsianstore -d parsian_store -tAc \
    "SELECT datname FROM pg_database WHERE datistemplate = false"
parsian_store
postgres

$ dc exec -T postgres psql -U parsianstore -d parsian_store -tAc \
    "SELECT count(*) FROM pg_database WHERE datname LIKE '%\_test'"
0
```

`postgres` is the cluster's own maintenance database and always exists.
`parsian_store` is yours. **A `parsian_store_test` must never appear here** —
see §10.1 for why, and what to do if it has.

---

## 6. TLS and the reverse proxy

Both services bind to `127.0.0.1` on the host, so put nginx, Caddy or Traefik
in front of them. Two names, two upstreams:

- `your-domain.ir` → `http://127.0.0.1:3000` (web)
- `api.your-domain.ir` → `http://127.0.0.1:4000` (api)

Then make sure `.env.production` agrees with reality:
`NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_API_URL` are the public `https://`
names, `PUBLIC_URL` matches the api one, and `CORS_ORIGINS` lists the site
origin first. Changing the two `NEXT_PUBLIC_*` values requires a **rebuild**
of the web image, not a restart — see §10.4.

Do not set `WEB_BIND`/`API_BIND` to `0.0.0.0` unless you have decided to serve
plain HTTP straight off the box. Those values exist for that case and nothing
about the app assumes it.

---

## 7. Updating to a new version

```bash
cd parsian-store
git pull                                  # or: git fetch && git checkout <tag>
dc up -d --build
```

`up -d --build` rebuilds the images, re-runs the one-shot `migrate` service
(which applies any new migrations and is a no-op when there are none), and
recreates only the containers whose image actually changed.

Verify afterwards with §5, and read the migrate log:

```
$ dc logs migrate | tail -3
8 migrations found in prisma/migrations
No pending migrations to apply.
```

**Rolling back.** Nothing in this stack keeps an old image around unless you
ask it to. If you want that, set `IMAGE_TAG` in `.env.production` per release
(`IMAGE_TAG=2026-09-16`), so each deploy leaves a tagged image you can pin to
by putting the old value back and running `dc up -d` without `--build`.

Rolling the *database* back is a restore (§8), and a migration that dropped a
column cannot be undone by starting the old image. Take a dump before an
update that includes migrations.

---

## 8. Backup and restore

Two different things, both worth having.

### 8.1 Logical dump — do this on a schedule

Runs against the live stack, no downtime, and restores onto any PostgreSQL 18.

```bash
mkdir -p ~/backups
dc exec -T postgres pg_dump -U parsianstore -d parsian_store --format=custom \
  > ~/backups/parsian_store-$(date +%F-%H%M).dump
```

Real result on a seeded-but-otherwise-empty shop:

```
$ ls -lh ~/backups/
-rw-r--r-- 1 deploy deploy 152K  parsian_store-2026-09-16-0142.dump
```

`-T` matters: without it Docker allocates a TTY and corrupts the binary stream
on its way to the file.

Nightly, via the deploying user's crontab (`crontab -e`):

```cron
15 3 * * * cd /home/deploy/parsian-store && docker compose --env-file .env.production -f compose.prod.yaml exec -T postgres pg_dump -U parsianstore -d parsian_store --format=custom > /home/deploy/backups/parsian_store-$(date +\%F).dump 2>>/home/deploy/backups/backup.log
```

Then copy the directory off the VPS. A backup that only exists on the machine
it is backing up is not a backup.

**Restore into a scratch database first** — always, even when you are sure:

```bash
cat ~/backups/parsian_store-2026-09-16-0142.dump | dc exec -T postgres sh -c 'cat > /tmp/restore.dump'
dc exec -T postgres psql -U parsianstore -d postgres -c 'CREATE DATABASE restore_check'
dc exec -T postgres pg_restore -U parsianstore -d restore_check --no-owner /tmp/restore.dump
dc exec -T postgres psql -U parsianstore -d restore_check -tAc 'SELECT count(*) FROM "Product"'
```

```
CREATE DATABASE
320
```

That number is the check. When you are satisfied, drop the scratch copy:

```bash
dc exec -T postgres psql -U parsianstore -d postgres -c 'DROP DATABASE restore_check'
```

**Restoring over the real database** is destructive and needs the api stopped
so nothing writes underneath you:

```bash
dc stop api web
dc exec -T postgres psql -U parsianstore -d postgres -c 'DROP DATABASE parsian_store'
dc exec -T postgres psql -U parsianstore -d postgres -c 'CREATE DATABASE parsian_store OWNER parsianstore'
dc exec -T postgres pg_restore -U parsianstore -d parsian_store --no-owner /tmp/restore.dump
dc start api web
```

### 8.2 Cold volume tarball — before an upgrade, or to move hosts

A byte-for-byte copy of the data directory. It must be taken with the database
**stopped**, and it can only be restored into the same PostgreSQL major
version.

```bash
dc down                       # stops everything; named volumes survive this
docker run --rm \
  -v parsianstore-prod_postgres-data:/v:ro \
  -v "$PWD:/backup" \
  alpine tar czf /backup/pgdata-$(date +%F).tar.gz -C /v .
dc up -d
```

```
$ ls -lh pgdata-2026-09-16.tar.gz
-rw-r--r-- 1 deploy deploy 9.4M pgdata-2026-09-16.tar.gz

$ tar tzf pgdata-2026-09-16.tar.gz | head -3
./
./18/
./18/docker/
```

That `18/docker/` prefix is the layout PostgreSQL 18 uses, and it is why both
compose files mount the volume at `/var/lib/postgresql` and **not** at
`/var/lib/postgresql/data`. The 18+ images keep the cluster in a
major-version subdirectory so `pg_upgrade --link` can work across one mount
point; mounting the old path makes the container refuse to start.

Restoring it into a fresh volume:

```bash
dc down
docker volume rm parsianstore-prod_postgres-data       # only if it exists and you mean it
docker volume create parsianstore-prod_postgres-data
docker run --rm \
  -v parsianstore-prod_postgres-data:/v \
  -v "$PWD:/backup" \
  alpine sh -c 'cd /v && tar xzf /backup/pgdata-2026-09-16.tar.gz'
dc up -d
```

### 8.3 Uploaded images

`STORAGE_DRIVER=local` means product photography lives in the
`parsianstore-prod_api-uploads` volume, not in the database. A dump does not
contain it. Same recipe:

```bash
docker run --rm -v parsianstore-prod_api-uploads:/v:ro -v "$PWD:/backup" \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /v .
```

---

## 9. Leftovers from the MongoDB era

This project ran on MongoDB before it moved to PostgreSQL. The code migration
is complete — there is no Mongoose, no `models/` directory, and every "mongo"
string left in the source is a comment explaining a decision. **There is
nothing to migrate.** What can survive, though, is a Docker volume, because:

> `docker compose down` removes containers and networks. It does **not**
> remove named volumes. Ever. Not with `--rmi`, not with `--remove-orphans`.

So a volume created by an old `compose.yaml` outlives the database it belonged
to, the compose file that made it, and the migration that replaced it. It is
invisible in `docker compose ps` and shows up only in `docker volume ls`. On
the original development machine that volume was `parsian-store_parsianstore-mongodb`.

### 9.1 Find it

```bash
docker volume ls
docker volume ls --format '{{.Name}}' | grep -i mongo
```

A healthy host shows the two production volumes and nothing Mongo-shaped:

```
parsianstore-prod_api-uploads
parsianstore-prod_postgres-data
```

If `grep -i mongo` prints a name, you have one. Check whether anything is
still using it before touching it:

```bash
docker ps -a --filter volume=parsian-store_parsianstore-mongodb
```

Empty output means no container references it.

### 9.2 Back it up before you delete it

Deleting a volume is irreversible and there is no confirmation prompt. Take
the tarball first, even though you are confident:

```bash
docker run --rm \
  -v parsian-store_parsianstore-mongodb:/v:ro \
  -v "$PWD:/backup" \
  alpine tar czf /backup/mongo.tar.gz -C /v .
ls -lh mongo.tar.gz
```

Copy `mongo.tar.gz` somewhere off the box, then:

### 9.3 Remove it

```bash
docker volume rm parsian-store_parsianstore-mongodb
```

Also worth sweeping, by name and only by name:

```bash
docker ps -a --filter name=mongo          # stale containers
docker images | grep -i mongo             # the mongo image itself, if unused
```

**Do not use `docker system prune` or `docker volume prune` to do this.** They
delete every unused volume on the host, and on a machine that also runs other
projects — or where the production stack is temporarily `down` — that includes
data you meant to keep. Remove volumes one at a time, by name.

---

## 10. Troubleshooting

### 10.1 "I see two databases"

You connected to the cluster and found both `parsian_store` and
`parsian_store_test`. Here is what each is.

- **`parsian_store`** is the real one. Everything in it is yours.
- **`parsian_store_test`** is created by the *test harness*.
  `apps/api/src/config/prisma.ts`'s `resolveDatabaseUrl()` appends `_test` to
  the database name when, and only when, `NODE_ENV=test`, and
  `apps/api/src/config/testDbSetup.ts` — vitest's `globalSetup` — creates and
  migrates that database if it is missing.

That behaviour is correct and load-bearing **locally**: the suite truncates
every table between files, and the reason it exists at all is that it once did
that to a developer's own seeded catalogue. It has no business on a production
host.

It cannot happen in this stack. `compose.prod.yaml` pins `NODE_ENV=production`
on both the api and the ops container, never sets `TEST_DATABASE_URL`, and the
runtime image contains no test runner at all — there is no vitest in it to run
a `globalSetup`. Verify:

```
$ dc exec -T api node -e "console.log(process.env.NODE_ENV, process.env.TEST_DATABASE_URL)"
production undefined
```

So if you *do* see a `_test` database on a production host, it was created by
somebody running the test suite against this server — from a laptop with a
`DATABASE_URL` pointed here, most likely. Two things to do, in order:

1. Find out which `DATABASE_URL` that was and fix it. A test run against this
   database would have truncated every table in `parsian_store_test`, which is
   harmless, but the same misconfiguration one `NODE_ENV` away truncates the
   real one.
2. Drop it. It is only ever generated data:

   ```bash
   dc exec -T postgres psql -U parsianstore -d postgres -c \
     'DROP DATABASE IF EXISTS parsian_store_test'
   ```

   Take a dump of the real database first (§8.1) if you want to be careful —
   `DROP DATABASE` names one database and cannot touch another, but a typo in
   that command can.

### 10.2 `migrate` exits 1 with "password authentication failed"

`DATABASE_URL`'s password does not match `POSTGRES_PASSWORD`. The catch:
**`POSTGRES_PASSWORD` only takes effect when the cluster is first
initialised.** Changing it later changes nothing about the running database —
the container reuses the existing data directory and the old password is still
the real one.

Fix the running cluster instead of guessing:

```bash
dc exec -T postgres psql -U parsianstore -d postgres -c \
  "ALTER USER parsianstore WITH PASSWORD 'the-value-now-in-your-env-file'"
dc up -d
```

### 10.3 `postgres` container restarts immediately

Read `dc logs postgres`. If it mentions an incompatible or unrecognised data
directory, the volume is mounted at the wrong path. It must be
`/var/lib/postgresql`, not `/var/lib/postgresql/data` — §8.2 explains why.

### 10.4 The storefront calls the wrong API URL

Symptom: the page renders but nothing in the browser works, and the console
shows requests to `undefined/api/v1/...` or to the old domain.

`NEXT_PUBLIC_*` values are compiled into the JavaScript the browser
downloads. They are **build arguments**, not runtime environment. Editing
`.env.production` and restarting does nothing. Rebuild:

```bash
dc build web && dc up -d web
```

### 10.5 Compose says a port is already allocated

Something else on the VPS holds 3000 or 4000. Change `WEB_PORT` / `API_PORT`
in `.env.production` and point the reverse proxy at the new numbers. Nothing
inside the containers changes — they always listen on 3000 and 4000 there.

### 10.6 `dc run --rm migrate seed:staff` fails validation

`ADMIN_SEED_PHONE` is empty or is not an Iranian mobile number. It wants the
`09xxxxxxxxx` form.

### 10.7 The api is "unhealthy" but its log looks fine

The healthcheck fetches `http://127.0.0.1:4000/api/v1/health` from inside the
container with Node's global `fetch`. If it fails while the log is quiet, the
process is probably still starting — `start_period` is 30s. Check by hand:

```bash
dc exec -T api node -e "fetch('http://127.0.0.1:4000/api/v1/health').then(r=>r.text()).then(console.log)"
```

---

## 11. Things this deployment does not do yet

Stated plainly so nobody assumes otherwise:

- **No automated backups.** §8.1 gives you the cron line; somebody has to add
  it and then check that the files are appearing and being copied off-box.
- **No TLS.** §6 is a description of what you must build, not something this
  stack provides.
- **No log shipping or metrics.** The API logs JSON to stdout, which
  `docker compose logs` shows and any log driver can collect; nothing is
  configured to do so.
- **Real SMS and real payments are off by default** (`SMS_PROVIDER=mock`,
  `PAYMENT_PROVIDER=mock`). See §4.1.
- **`STORAGE_DRIVER=local`** keeps uploaded imagery on the VPS's disk in a
  Docker volume. There is no S3 driver implemented; back the volume up (§8.3).
