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

/** @type {import('next').NextConfig} */
const nextConfig = {
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
