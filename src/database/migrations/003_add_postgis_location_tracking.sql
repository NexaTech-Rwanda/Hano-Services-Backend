CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS geo_location geography(Point, 4326);

UPDATE providers
SET geo_location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE geo_location IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_providers_geo_location
  ON providers USING GIST (geo_location);

CREATE OR REPLACE FUNCTION sync_providers_geo_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo_location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geo_location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_providers_geo_location ON providers;
CREATE TRIGGER trg_sync_providers_geo_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON providers
FOR EACH ROW EXECUTE FUNCTION sync_providers_geo_location();

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS geo_location geography(Point, 4326);

UPDATE bookings
SET geo_location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE geo_location IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_geo_location
  ON bookings USING GIST (geo_location);

CREATE OR REPLACE FUNCTION sync_bookings_geo_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo_location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geo_location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_bookings_geo_location ON bookings;
CREATE TRIGGER trg_sync_bookings_geo_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON bookings
FOR EACH ROW EXECUTE FUNCTION sync_bookings_geo_location();

CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geo_location geography(Point, 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_geo_location ON user_locations USING GIST (geo_location);
CREATE INDEX IF NOT EXISTS idx_user_locations_created_at ON user_locations(created_at);

CREATE OR REPLACE FUNCTION sync_user_locations_geo_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo_location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geo_location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_locations_geo_location ON user_locations;
CREATE TRIGGER trg_sync_user_locations_geo_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON user_locations
FOR EACH ROW EXECUTE FUNCTION sync_user_locations_geo_location();
