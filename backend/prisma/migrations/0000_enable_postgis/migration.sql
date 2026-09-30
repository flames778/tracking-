-- Optional PostGIS support.
-- Geospatial logic currently runs in application code (src/common/utils/geo.util.ts),
-- so the platform works on plain PostgreSQL. When PostGIS is available this enables it
-- so that native ST_* queries can be added later without a new migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') THEN
    CREATE EXTENSION IF NOT EXISTS postgis;
  ELSE
    RAISE NOTICE 'postgis not available on this server — skipping (application-layer geo utils are used)';
  END IF;
END
$$;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
