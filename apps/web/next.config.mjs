import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Security headers for the pages a customer actually loads.
 *
 * `apps/api` has mounted `helmet()` since P2, which is exactly why this was
 * missed for so long: the API was covered and the storefront was not, and the
 * storefront is the half that holds a session and collects an address.
 *
 * WHY THERE IS NO `Content-Security-Policy` HERE YET, deliberately: a useful
 * CSP for this app has to be nonce-based, and three inline scripts need that
 * nonce -- next-themes' blocking theme script, the parts manifest's pre-paint
 * script (P12.S5), and Next's own hydration bootstrap. Wiring nonces means
 * threading one from middleware through the document, and shipping
 * `script-src 'unsafe-inline'` instead would be a header that reads like
 * protection and is not. It is written up in tasks.md as its own task rather
 * than half-done here.
 *
 * WHY `Strict-Transport-Security` IS GATED ON AN https ORIGIN, and not on
 * `NODE_ENV`: a browser that sees HSTS from `localhost` pins it, and every
 * later `http://localhost` project on that machine gets force-upgraded to
 * https. It is genuinely hard to undo. `NODE_ENV === "production"` looks like
 * the right gate and is not -- `next start` sets it, so the first version of
 * this sent HSTS to every developer running the production server locally,
 * and to the e2e suite, which serves a build on localhost. The condition that
 * actually means "we are on a real origin" is that we have been told what it
 * is, over https.
 */
const securityHeaders = [
  // Clickjacking. `frame-ancestors` is the modern form and would live in the
  // CSP; `X-Frame-Options` is what protects the page until that CSP exists.
  { key: "X-Frame-Options", value: "DENY" },
  // Stops a response being reinterpreted as a script or stylesheet against
  // its declared type -- the MIME-sniffing half of a stored-XSS chain.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the full URL within the site, only the origin when leaving it. A
  // product page path can carry a part number; a referring origin cannot.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This app asks for none of these, so it should say so rather than leave
  // the defaults available to anything that ends up embedded.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")
    ? [
        {
          key: "Strict-Transport-Security",
          // No `preload`: that submits the domain to a browser-shipped list
          // that is slow and awkward to leave, and it is the owner's call on
          // a domain that has not launched.
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

/**
 * WHY `output: "standalone"` IS BEHIND A FLAG AND NOT ALWAYS ON.
 *
 * The Docker image (`apps/web/Dockerfile`) needs it: standalone emits a
 * self-contained `.next/standalone` with its own `server.js` and only the
 * modules file-tracing proved are reachable, which is what keeps the runtime
 * image free of the workspace's dev dependencies.
 *
 * Every other build must not change. `next build` normally leaves `.next` in
 * the shape `scripts/check-budget.mjs`, the Playwright suite and the local
 * Lighthouse/screenshot harnesses all read, and `pnpm build` runs through
 * turbo with `.next/**` as its cache output. Turning standalone on globally
 * would add an untested `.next/standalone` tree to every one of those for the
 * sake of one consumer. So: opt-in, set only by the Dockerfile.
 *
 * `outputFileTracingRoot` travels with it. Tracing has to start at the
 * monorepo root or it will not follow `schemas` out of `apps/web` into
 * `packages/schemas/dist`, and the standalone server starts with a module it
 * cannot resolve.
 */
const standalone = process.env.NEXT_OUTPUT_STANDALONE === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(standalone
    ? {
        output: "standalone",
        outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".."),
      }
    : {}),
  transpilePackages: ["schemas", "config"],
  async headers() {
    // Every route, including the static assets under /landing and /_next.
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Internal workspace packages (packages/schemas, packages/config) are consumed
  // as TypeScript source with no build step. Their own relative imports use the
  // explicit ".js" extension required by TS's NodeNext resolution (see
  // docs/decisions/0001-typescript-over-plain-js.md), which webpack does not
  // resolve to ".ts" by default -- this alias bridges that gap.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
