import "dotenv/config";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

/**
 * Applies Prisma migrations to the dedicated test database before the suite.
 * Refuses to run unless TEST_DATABASE_URL explicitly names a database ending
 * in `_test`, so destructive test cleanup can never touch development data.
 *
 * The Prisma CLI is executed through the current Node binary (rather than
 * `npx`) so this works on Windows without shell quoting issues.
 */
export default function globalSetup(): void {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is required to run the integration test suite.");
  }

  const databaseName = new URL(testUrl).pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests: TEST_DATABASE_URL database "${databaseName}" does not end with "_test".`
    );
  }

  const require = createRequire(import.meta.url);
  const prismaCli = require.resolve("prisma/build/index.js");
  const apiRoot = fileURLToPath(new URL("..", import.meta.url));

  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    stdio: "inherit",
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: testUrl }
  });
}
