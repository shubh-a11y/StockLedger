-- Runs only when the Docker volume is first initialised.
-- The integration test suite refuses to run unless the database name ends
-- in `_test`, so this keeps local verification reproducible.
CREATE DATABASE stockledger_test;
