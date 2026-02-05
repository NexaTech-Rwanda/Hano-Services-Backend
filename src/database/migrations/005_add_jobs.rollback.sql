-- Drop jobs table and related objects

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
DROP TRIGGER IF EXISTS trg_sync_jobs_geo_location ON jobs;
DROP FUNCTION IF EXISTS sync_jobs_geo_location();

DROP INDEX IF EXISTS idx_jobs_created_at;
DROP INDEX IF EXISTS idx_jobs_geo_location;
DROP INDEX IF EXISTS idx_jobs_deadline;
DROP INDEX IF EXISTS idx_jobs_assigned_provider_id;
DROP INDEX IF EXISTS idx_jobs_status;
DROP INDEX IF EXISTS idx_jobs_service_category_id;
DROP INDEX IF EXISTS idx_jobs_customer_id;

DROP TABLE IF EXISTS jobs;
