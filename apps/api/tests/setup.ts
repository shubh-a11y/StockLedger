import "dotenv/config";

process.env.NODE_ENV = "test";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is required to run the test suite.");
}

process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test_only_jwt_secret_that_is_at_least_32_characters";
process.env.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
