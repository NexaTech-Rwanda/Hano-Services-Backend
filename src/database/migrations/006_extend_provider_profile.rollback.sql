-- Rollback: Drop added columns and indexes from providers table

DROP INDEX IF EXISTS idx_providers_certifications;
DROP INDEX IF EXISTS idx_providers_languages;
DROP INDEX IF EXISTS idx_providers_preferred_contact;
DROP INDEX IF EXISTS idx_providers_response_rate;
DROP INDEX IF EXISTS idx_providers_featured_until;
DROP INDEX IF EXISTS idx_providers_is_featured;

ALTER TABLE providers
  DROP COLUMN IF EXISTS featured_until,
  DROP COLUMN IF EXISTS is_featured,
  DROP COLUMN IF EXISTS preferred_contact_method,
  DROP COLUMN IF EXISTS social_links,
  DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS response_time_minutes,
  DROP COLUMN IF EXISTS response_rate,
  DROP COLUMN IF EXISTS availability_hours,
  DROP COLUMN IF EXISTS languages,
  DROP COLUMN IF EXISTS certifications,
  DROP COLUMN IF EXISTS bio;
