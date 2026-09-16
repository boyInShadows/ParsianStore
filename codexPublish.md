# codexPublish.md — taking ParsianStore live on parsianstore.shop

**Audience:** the agent (Codex) operating the Parspack VPS over SSH, plus the
owner who has to supply the things no agent can invent.

**Status of this file:** written 2026-09-16 against `main` @ `72de967` by
reading the actual code and compose files, not from memory. Where it says
"verified", it was checked in the repository. Where it says "expected",
nobody has run it on *this* VPS yet.

**Relationship to `docs/deployment.md`:** that document is the reference for
the stack itself — every command in it was run against this stack before it
was written down, and it is trustworthy. **Do not duplicate it, follow it.**
This file is the ordered runbook around it: the parts that are specific to
this domain, this host and this country, the order things must happen in, and
four things `docs/deployment.md` does not cover at all. Read both. When they
disagree about the stack, `docs/deployment.md` wins; when they disagree about
*ordering or this host*, this file wins.

---

## 0. Hard rules — violate none of these

1. **Never commit `.env.production`, or paste its contents anywhere** — not
   into a chat, an issue, a screenshot, or a commit. It is covered by
   `.gitignore`'s `.env.*` rule. Secrets are generated **on the VPS** and stay
   there.
2. **Never publish the Postgres port.** `dc ps` must show `5432/tcp` with
   nothing before the arrow. `0.0.0.0:5432->5432/tcp` means the database is on
   the internet — stop and fix it before anything else.
3. **Never run `docker system prune` or `docker volume prune`.** They delete
   every unused volume on the host, which includes your database whenever the
   stack is temporarily `down`. Remove volumes one at a time, by name.
4. **Never run the test suite against this host's database.** Anything with
   `NODE_ENV=test` creates and truncates a `<name>_test` database. See
   `docs/deployment.md` §10.1.
5. **Never run `dc run --rm migrate seed:visual-catalog`** on this box. It is
   demo data built from a CSV, not production catalogue.
6. **Never run `prisma db push`.** Migrations only — `migrate deploy`, which
   is what the one-shot service already does.
7. **Take a database dump before any update that includes a migration**
   (`docs/deployment.md` §8.1). A migration that dropped a column cannot be
   undone by starting the old image.
8. **Do not open the shop to real customers while `PAYMENT_PROVIDER=mock`.**
   See §9 — this is the one that costs money rather than time.

---

## 1. What the owner must provide

Nothing below can be discovered from the code. Until each is supplied the
deploy stops at the step that needs it. **Do not send secrets through chat —
generate them on the VPS where the instructions say so.**

### 1.1 Needed before anything can start

| # | Item | Notes |
|---|---|---|
| 1 | **VPS SSH access** | host/IP, user, key or password, and whether that user can `sudo`. |
| 2 | **VPS specs** | `nproc`, `free -h`, `df -h`. 2 vCPU / 4 GB is comfortable. **Under 4 GB, swap must be added before building** — `next build` is the memory-hungry step and gets OOM-killed on small boxes. |
| 3 | **OS + Docker state** | `cat /etc/os-release`, `docker --version`, `docker compose version`. Compose **v2** ("`docker compose`", not "`docker-compose`") is required. |
| 4 | **Where DNS for `parsianstore.shop` is managed** | Parspack's panel, the registrar, or Cloudflare/ArvanCloud. The agent needs the owner to create records; it cannot do this itself. |
| 5 | **An email address for TLS certificates** | Let's Encrypt sends expiry warnings to it. Any mailbox the owner reads. |
| 6 | **The superadmin mobile number** | Iranian format `09xxxxxxxxx`. Becomes `ADMIN_SEED_PHONE`, and is the number used to sign in to `/admin`. |
| 7 | **GitHub access for the VPS, if the repo is private** | A read-only **deploy key** (preferred — scoped to this one repo) or a personal access token. `git clone` in §6 fails with an auth prompt otherwise. Generate the key on the VPS with `ssh-keygen -t ed25519 -C parsianstore-vps -f ~/.ssh/id_deploy`, then add the **public** half in GitHub → repo → Settings → Deploy keys. Never put a token in a URL that ends up in shell history or a git remote. |

### 1.2 Needed before real customers, not before first deploy

| # | Item | Blocks |
|---|---|---|
| 7 | **Kavenegar API key + approved OTP template** | Real SMS. Until then `SMS_PROVIDER=mock` writes the one-time password to the API log — workable for the owner's own first login, unacceptable for customers. |
| 8 | **Zarinpal merchant id** | Real payments. Requires the legal entity / e-Namad paperwork, which per `tasks.md` has not been started. **This is the gate on opening the shop.** |
| 9 | **e-Namad seal id** | `NEXT_PUBLIC_ENAMAD_ID`. Same paperwork. Can be empty at launch; the seal simply does not render. |
| 10 | **A decision: does the site go public before payments work?** | See §9. If yes, it must be behind HTTP auth or a "coming soon" state — not openly taking orders. |

### 1.3 Decisions the owner should confirm now

- **Subdomain layout.** This file assumes `parsianstore.shop` → storefront and
  `api.parsianstore.shop` → API, which is what `docs/deployment.md` §6 and
  `.env.production.example` are written for. Confirm, because it is baked into
  the web image at build time and changing it later means a rebuild.
- **`www`.** This file sets up `www.parsianstore.shop` to redirect to the
  apex. Say so if you want the opposite.
- **Backups off-box.** §8 sets up a nightly dump *on the VPS*. A backup that
  only exists on the machine it is backing up is not a backup. Where should
  they be copied to?

---

## 2. Four things `docs/deployment.md` does not cover

These were found by reading the code on 2026-09-16. Two of them are launch
blockers. Handle them as part of this deploy, not afterwards.

### 2.1 🔴 BLOCKER — rate limiting will throttle the entire site to one bucket

**Verified in the code, not theorised.** `apps/api/src/app.ts` never calls
`app.set("trust proxy", …)`, and `apps/api/src/middleware/rateLimit.ts`'s
`apiRateLimiter` (100 requests/minute) and `authRateLimiter` (10 per 15
minutes) use `express-rate-limit`'s default key, which is `req.ip`.

Behind a reverse proxy, `req.ip` is **the proxy's address** — `127.0.0.1` —
for every visitor. So all traffic on the whole site shares a single bucket of
100 requests per minute, and the 101st request from anyone gets
`429 تعداد درخواست‌ها بیش از حد مجاز است`.

It is worse than it sounds, because of §2.2: server-side rendering also calls
the API through the proxy, so a handful of simultaneous visitors is enough.

**This needs a small code change before real traffic** — `app.set("trust
proxy", 1)` (the number of proxies in front, 1 for a single nginx/Caddy),
plus a check that `express-rate-limit`'s `standardHeaders` behaviour is still
right afterwards. It is a one-line app change with a test, not an ops
workaround, and it should be done in the repo on `development` and merged —
**not hand-patched on the VPS**, where the next `git pull` would silently
erase it.

Until it is fixed: the stack works fine for the owner's own testing and for a
handful of people. It will fall over on launch day.

### 2.2 ⚠️ Server-side rendering calls the API through the public internet

`apps/web/lib/api-client.ts` and every file in `apps/web/lib/fetchers/` read
`process.env.NEXT_PUBLIC_API_URL`, with no internal-URL override. In
production that value is `https://api.parsianstore.shop`, so a server-rendered
page inside the `web` container fetches its own public domain: **out through
the proxy, back in again**, for every SSR request.

`compose.prod.yaml`'s comment next to that variable describes reaching the API
at `api:4000` on the compose network and calls the public round trip "a
pointless round trip through the reverse proxy" — but the value it actually
passes is the public URL. **The comment describes an intent the code does not
implement.** Treat the comment as stale; the round trip is what happens.

Consequences to plan around, in order of how likely they are to waste a day:

1. **Nothing renders with data until DNS and TLS are live.** Containers will
   be healthy, `/api/v1/health` will answer on `localhost:4000`, and the
   storefront will still show an empty/error catalogue, because SSR cannot
   resolve `https://api.parsianstore.shop` yet. **This is expected during
   §5–§6 and is not a bug.** It resolves the moment the proxy is up.
2. The VPS must be able to reach its own public hostname. This usually works;
   if it does not, the symptom is SSR timeouts with a healthy API, and the fix
   is a `/etc/hosts` entry or compose `extra_hosts` pointing the public name at
   the host.
3. Every SSR page view consumes proxy capacity and rate-limit budget — which
   is what makes §2.1 acute rather than theoretical.

Not a blocker. Worth a follow-up issue to add a server-only internal base URL.

### 2.3 🔴 BLOCKER for this host — Docker Hub and npm reachability from Iran

`apps/api/Dockerfile` and `apps/web/Dockerfile` build `FROM
node:22-bookworm-slim`, compose pulls `postgres:18`, and the build installs
from `registry.npmjs.org` (there is no `.npmrc` in the repo, so the default
registry is used). All three are routinely blocked, throttled or
intermittently unreachable from Iranian IP ranges.

`docs/deployment.md` was not written against an Iranian host and says nothing
about this. **Test it before anything else** — §4 is a gate for exactly this
reason. If the images cannot be pulled and the packages cannot be installed,
no amount of correct configuration matters.

### 2.4 ⚠️ `docs/deployment.md` §1 says `git checkout development`

For this VPS that is wrong — use **`main`**, which is what the owner pushes
releases to and is currently a superset of `development`. Everything else in
that document applies unchanged.

---

## 3. The shape of what you are building

```
                    the VPS
  ┌──────────────────────────────────────────────────────────┐
  │  Caddy (or nginx)          :80  :443   ← the only open   │
  │    parsianstore.shop      → 127.0.0.1:3000   ports       │
  │    www.parsianstore.shop  → redirect to apex             │
  │    api.parsianstore.shop  → 127.0.0.1:4000               │
  │         │                        │                        │
  │  ┌──────▼──────┐          ┌──────▼──────┐                │
  │  │     web     │─ SSR ───▶│     api     │  (§2.2: that   │
  │  │  Next 15    │  via the └──────┬──────┘   arrow goes   │
  │  └─────────────┘  public URL     │          out and back)│
  │                                  │ postgres:5432          │
  │                           ┌──────▼──────┐                │
  │                           │  postgres18 │ NO PUBLISHED   │
  │                           └──────┬──────┘ PORT           │
  │                     volume parsianstore-prod_postgres-data│
  └──────────────────────────────────────────────────────────┘
```

Four compose services in `compose.prod.yaml`: `postgres`, `migrate` (one-shot,
exits 0 — that is success, not a crash), `api`, `web`.

---

## 4. GATE — connectivity, before you touch anything else

Run these first. If any fails, stop and solve that before continuing; nothing
later works without them.

```bash
# 1. Can Docker Hub be reached at all?
curl -sSI --max-time 15 https://registry-1.docker.io/v2/ | head -1

# 2. Can the npm registry be reached?
curl -sSI --max-time 15 https://registry.npmjs.org/ | head -1

# 3. The real test — an actual pull:
docker pull hello-world && docker pull node:22-bookworm-slim && docker pull postgres:18
```

**If the pulls fail or hang**, the options, best first:

1. **Configure a registry mirror.** Ask Parspack support for the mirror they
   currently recommend — do not trust a hardcoded URL from any document
   including this one, as the Iranian mirrors change often. Then:

   ```bash
   sudo mkdir -p /etc/docker
   sudo nano /etc/docker/daemon.json
   ```
   ```json
   { "registry-mirrors": ["https://<mirror-host-from-parspack>"] }
   ```
   ```bash
   sudo systemctl restart docker
   docker pull node:22-bookworm-slim     # retry the gate
   ```

2. **For npm**, if step 2 above failed, set a mirror for the build. This needs
   an `.npmrc` the Dockerfiles will pick up — coordinate it as a repo change
   rather than a file hand-made on the VPS, for the same reason as §2.1.

3. **Build elsewhere, ship the images.** If the VPS cannot reach the
   registries at all, build on a machine that can and transfer:

   ```bash
   # on the machine with access, in the repo:
   docker compose --env-file .env.production -f compose.prod.yaml build
   docker save parsianstore/web:latest parsianstore/api:latest parsianstore/api-ops:latest | gzip > images.tar.gz
   # copy to the VPS, then there:
   gunzip -c images.tar.gz | docker load
   ```
   Then `dc up -d` **without** `--build`. Note the images must be built with
   the *final* `NEXT_PUBLIC_*` values (§2.2, §6).

Also check resources while you are here:

```bash
nproc; free -h; df -h /
```

Under 4 GB of RAM, add swap before building:

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

---

## 5. DNS — do this early, it takes the longest to propagate

The owner creates these at whoever manages `parsianstore.shop`:

| Type | Name | Value |
|---|---|---|
| A | `@` (apex) | the VPS IPv4 |
| A | `www` | the VPS IPv4 |
| A | `api` | the VPS IPv4 |

If the DNS provider proxies traffic (Cloudflare's orange cloud, ArvanCloud's
equivalent), **turn it off for now** — HTTP-01 certificate issuance in §6 is
simpler without it, and it can be re-enabled afterwards.

Verify from the VPS before continuing to §6:

```bash
# `dig` lives in dnsutils/bind-utils and is often absent on a minimal VPS:
command -v dig || sudo apt install -y dnsutils

dig +short parsianstore.shop
dig +short www.parsianstore.shop
dig +short api.parsianstore.shop
# no dig, no apt? `getent hosts parsianstore.shop` works everywhere
```

All three must return the VPS's own IP. DNS can take minutes to hours to
propagate; §6 can proceed while waiting, §7 cannot.

---

## 6. Deploy the stack

Follow `docs/deployment.md` §2–§4. Condensed, with this host's specifics:

```bash
# clone (note: main, not development — §2.4)
git clone https://github.com/boyInShadows/ParsianStore.git parsian-store
cd parsian-store
git checkout main

cp .env.production.example .env.production
chmod 600 .env.production
```

Generate the three secrets **on this machine** and paste them into the file:

```bash
openssl rand -base64 24 | tr -d '/+=' | cut -c1-24    # POSTGRES_PASSWORD
openssl rand -hex 32                                   # JWT_ACCESS_SECRET
openssl rand -hex 32                                   # JWT_REFRESH_SECRET  (must differ)
```

Fill `.env.production` with exactly these values for this domain:

```ini
POSTGRES_PASSWORD=<generated above>
DATABASE_URL=postgresql://parsianstore:<same password>@postgres:5432/parsian_store?schema=public
JWT_ACCESS_SECRET=<generated>
JWT_REFRESH_SECRET=<generated, different>

NEXT_PUBLIC_SITE_URL=https://parsianstore.shop
NEXT_PUBLIC_API_URL=https://api.parsianstore.shop
PUBLIC_URL=https://api.parsianstore.shop
CORS_ORIGINS=https://parsianstore.shop,https://www.parsianstore.shop

ADMIN_SEED_PHONE=09xxxxxxxxx
IMAGE_TAG=2026-09-16
```

Three traps in that block, all real:

- `DATABASE_URL`'s host is **`postgres`**, the compose service name — not
  `localhost`, not `5433`. `5433` is development's port and does not exist here.
- `CORS_ORIGINS` order matters: checkout reads the **first** entry as the
  storefront's own origin when it builds the post-payment redirect. The apex
  goes first.
- `NEXT_PUBLIC_*` are **build arguments**, compiled into the JavaScript the
  browser downloads. Getting one wrong means `dc build web`, not a restart.
  Set them correctly *now*, before the first build.

Then:

```bash
alias dc='docker compose --env-file .env.production -f compose.prod.yaml'

dc config --quiet        # exits 0 only if every required variable is present
dc up -d --build         # several minutes on first run
dc ps
```

Seed, **in this order** (`docs/deployment.md` §4):

```bash
dc run --rm migrate seed:geo
dc run --rm migrate seed:vehicles
dc run --rm migrate seed:catalog
dc run --rm migrate seed:shipping
dc run --rm migrate seed:staff      # needs ADMIN_SEED_PHONE
```

**Verification gate — run all six checks in `docs/deployment.md` §5.** Two
matter most here:

```bash
dc ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'
# postgres MUST read `5432/tcp` with nothing before the arrow

curl -s localhost:4000/api/v1/health
# {"ok":true,"data":{"status":"up"}}
```

Check §5's step 5 (the storefront rendering seeded product names) **will fail
at this point** and that is expected — see §2.2. Re-run it after §7.

---

## 7. Reverse proxy and TLS for parsianstore.shop

Caddy is recommended over nginx here: it obtains and renews Let's Encrypt
certificates automatically, which is the part that otherwise goes wrong.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```caddyfile
parsianstore.shop {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}

www.parsianstore.shop {
	redir https://parsianstore.shop{uri} permanent
}

api.parsianstore.shop {
	encode zstd gzip
	# Product image uploads from /admin go through here.
	request_body {
		max_size 20MB
	}
	reverse_proxy 127.0.0.1:4000
}
```

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy sets `X-Forwarded-For` / `X-Forwarded-Proto` automatically — which is
what §2.1's fix will read once it lands.

**If nginx is required instead**, the equivalents that must not be forgotten:
`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,
`proxy_set_header X-Forwarded-Proto $scheme;`,
`proxy_set_header Host $host;`, `client_max_body_size 20m;`, plus certbot for
certificates and a renewal timer.

Firewall — only three ports:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

3000, 4000 and 5432 must **not** appear. They are bound to loopback already;
this is the second layer.

### Verification gate

```bash
curl -sI https://parsianstore.shop | head -3            # 200 or 3xx, valid TLS
curl -s  https://api.parsianstore.shop/api/v1/health    # {"ok":true,...}
curl -s  https://parsianstore.shop/ | grep -o 'dir="rtl"'
curl -s 'https://parsianstore.shop/c/engine' -o /tmp/c.html -w '%{http_code}\n'
grep -c 'فیلتر' /tmp/c.html      # non-zero == SSR is reaching the API
```

That last one is the real end-to-end proof, and it is the check that was
*expected to fail* in §6. If it is still zero here, read `dc logs web` — this
is the §2.2 failure mode.

---

## 8. After it is up

**First admin login.** With `SMS_PROVIDER=mock` no SMS is sent; the one-time
password is written to the API log:

```bash
dc logs -f api | grep -i otp
```

Sign in at `https://parsianstore.shop/admin` with `ADMIN_SEED_PHONE`.

**Nightly backup** (`docs/deployment.md` §8.1) — `crontab -e`:

```cron
15 3 * * * cd /home/<user>/parsian-store && docker compose --env-file .env.production -f compose.prod.yaml exec -T postgres pg_dump -U parsianstore -d parsian_store --format=custom > /home/<user>/backups/parsian_store-$(date +\%F).dump 2>>/home/<user>/backups/backup.log
```

`mkdir -p ~/backups` first. Then **check the next morning that a file
appeared**, and arrange copying them off the box (§1.3). Uploaded product
images live in a separate volume and are not in the dump — `docs/deployment.md`
§8.3.

**Updating later:**

```bash
cd parsian-store
dc exec -T postgres pg_dump -U parsianstore -d parsian_store --format=custom > ~/backups/pre-update-$(date +%F).dump
git pull origin main
dc up -d --build
dc logs migrate | tail -3
```
Then re-run §5's six checks. Bump `IMAGE_TAG` per release if you want a
previous image to roll back to.

---

## 9. 🔴 Before real customers — read this twice

**`PAYMENT_PROVIDER=mock` marks orders as paid without any money moving.**
A publicly reachable shop in this state will hand out real products for
free to anyone who completes checkout. This is not a theoretical risk; it
is what the mock provider is built to do.

So, until a Zarinpal merchant id exists and has been tested end to end, the
site must be **either** not publicly announced and behind HTTP basic auth at
the proxy, **or** in a state where checkout cannot complete. That is a
decision for the owner (§1.3), not something to leave to chance.

Full go-live checklist — every box, before announcing the domain:

- [ ] §2.1's `trust proxy` fix merged and deployed — otherwise the site
      throttles itself at ~100 requests/minute total
- [ ] `PAYMENT_PROVIDER=zarinpal`, real `ZARINPAL_MERCHANT_ID`,
      `ZARINPAL_SANDBOX=false`, and **one real test purchase completed and
      refunded**
- [ ] `SMS_PROVIDER=kavenegar` with a real key and approved template — and a
      real OTP received on a real phone
- [ ] `NEXT_PUBLIC_ENAMAD_ID` set (needs a `dc build web` afterwards) or the
      decision made to launch without the seal
- [ ] TLS valid on all three names, `www` redirecting to the apex
- [ ] Nightly dump verified as actually producing files, and copied off-box
- [ ] A restore rehearsed into a scratch database (`docs/deployment.md` §8.1)
      — an untested backup is not a backup
- [ ] `dc ps` shows postgres with no published port
- [ ] `docker volume ls | grep -i mongo` returns nothing
      (`docs/deployment.md` §9)
- [ ] Owner has signed into `/admin` and changed nothing that broke
- [ ] The seeded catalogue replaced with, or confirmed as, real products —
      `seed:catalog` inserts 320 demonstration products

---

## 10. Known-not-done, stated plainly

From `docs/deployment.md` §11 and this repo's `tasks.md`, so nobody assumes
otherwise:

- No automated backups until §8's cron is added **and verified**.
- No log shipping, no metrics, no alerting. The API logs JSON to stdout.
- No S3 driver; `STORAGE_DRIVER=local` keeps uploaded imagery in a Docker
  volume on this VPS's disk.
- e-Namad / legal entity registration **has not been started** and blocks real
  payments.
- No CDN, no image optimisation service beyond what Next.js does in-process.

---

## 11. If something breaks

`docs/deployment.md` §10 covers the stack's own failure modes and is the first
place to look: password authentication failures, the postgres volume mount
path, the "storefront calls the wrong API URL" rebuild trap, port collisions,
`seed:staff` validation, and the api healthcheck.

Host-specific symptoms this file adds:

| Symptom | Cause | Where |
|---|---|---|
| Image pulls hang or 403 | Docker Hub unreachable from Iranian IP | §4 |
| `next build` killed mid-build | Out of memory | §4, add swap |
| Containers healthy, storefront shows no products | SSR cannot reach the public API URL yet | §2.2 |
| Everything 429s under light load | `trust proxy` unset, one shared bucket | §2.1 |
| TLS issuance fails | DNS not propagated, or provider proxy still on | §5 |

**When stuck, report: the command, its full output, and `dc ps` + the relevant
`dc logs <service>`.** Do not guess at a fix that involves deleting a volume.
