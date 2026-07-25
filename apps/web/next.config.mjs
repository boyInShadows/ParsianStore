/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["schemas", "config"],
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

export default nextConfig;
