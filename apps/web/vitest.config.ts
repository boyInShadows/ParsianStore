import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "web",
    // "jsdom" + @testing-library/react land when Phase 1 starts testing real
    // components; nothing here renders the DOM yet.
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
  },
});
