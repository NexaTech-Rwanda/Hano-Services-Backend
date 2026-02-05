-- Add jobs table for customer job postings

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_category_id UUID NOT NULL REFERENCES service_categories(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  budget DECIMAL(12, 2) NOT NULL CHECK (budget >= 0),
  location_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geo_location geography(Point, 4326),
  deadline TIMESTAMP,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_service_category_id ON jobs(service_category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_provider_id ON jobs(assigned_provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_geo_location ON jobs USING GIST (geo_location);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- Function to sync geo_location from lat/long
CREATE OR REPLACE FUNCTION sync_jobs_geo_location()
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

-- Trigger to auto-sync geo_location
DROP TRIGGER IF EXISTS trg_sync_jobs_geo_location ON jobs;
CREATE TRIGGER trg_sync_jobs_geo_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON jobs
  FOR EACH ROW EXECUTE FUNCTION sync_jobs_geo_location();

-- Trigger to auto-update updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
