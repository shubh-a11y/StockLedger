import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Integration tests share one PostgreSQL database; running files serially
    // keeps their data isolated. The concurrency test still fires requests in
    // parallel inside a single file.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
});
