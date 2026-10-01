import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // "server-only" stops server code reaching the browser; in tests there is no browser.
      "server-only": path.resolve(__dirname, "tests/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // One store file per run; tests share it, so they run one after another.
    fileParallelism: false,
  },
})
