-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the database exists (created by POSTGRES_DB env var, this is a safety net)
SELECT 'Database ready' AS status;
