DROP TRIGGER IF EXISTS trg_sync_user_locations_geo_location ON user_locations;
DROP FUNCTION IF EXISTS sync_user_locations_geo_location();

DROP INDEX IF EXISTS idx_user_locations_created_at;
DROP INDEX IF EXISTS idx_user_locations_geo_location;
DROP INDEX IF EXISTS idx_user_locations_user_id;
DROP TABLE IF EXISTS user_locations;

DROP TRIGGER IF EXISTS trg_sync_bookings_geo_location ON bookings;
DROP FUNCTION IF EXISTS sync_bookings_geo_location();
DROP INDEX IF EXISTS idx_bookings_geo_location;
ALTER TABLE bookings DROP COLUMN IF EXISTS geo_location;

DROP TRIGGER IF EXISTS trg_sync_providers_geo_location ON providers;
DROP FUNCTION IF EXISTS sync_providers_geo_location();
DROP INDEX IF EXISTS idx_providers_geo_location;
ALTER TABLE providers DROP COLUMN IF EXISTS geo_location;
