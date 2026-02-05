-- Extend providers table with additional profile fields from designs

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS certifications TEXT[], -- Array of certification names/URLs
  ADD COLUMN IF NOT EXISTS languages TEXT[], -- Array of language codes or names
  ADD COLUMN IF NOT EXISTS availability_hours JSONB, -- e.g. {"mon": {"open": "09:00", "close": "17:00"}, ...}
  ADD COLUMN IF NOT EXISTS response_rate DECIMAL(5, 2) CHECK (response_rate >= 0 AND response_rate <= 100),
  ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER CHECK (response_time_minutes >= 0),
  ADD COLUMN IF NOT EXISTS website VARCHAR(255),
  ADD COLUMN IF NOT EXISTS social_links JSONB, -- e.g. {"twitter": "...", "linkedin": "...", "facebook": "..."}
  ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('phone', 'email', 'whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP; -- When featured status expires

-- Indexes for new fields
CREATE INDEX IF NOT EXISTS idx_providers_is_featured ON providers(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_providers_featured_until ON providers(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_providers_response_rate ON providers(response_rate);
CREATE INDEX IF NOT EXISTS idx_providers_preferred_contact ON providers(preferred_contact_method);

-- Add a GIN index for array searches (languages, certifications)
CREATE INDEX IF NOT EXISTS idx_providers_languages ON providers USING GIN (languages);
CREATE INDEX IF NOT EXISTS idx_providers_certifications ON providers USING GIN (certifications);
