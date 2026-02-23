-- Up: Add job_bids table
CREATE TABLE IF NOT EXISTS job_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    bid_amount DECIMAL(10, 2) NOT NULL,
    proposal_text TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (job_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_job_bids_job ON job_bids(job_id);
CREATE INDEX IF NOT EXISTS idx_job_bids_provider ON job_bids(provider_id);
CREATE INDEX IF NOT EXISTS idx_job_bids_status ON job_bids(status);

DROP TRIGGER IF EXISTS update_job_bids_updated_at ON job_bids;
CREATE TRIGGER update_job_bids_updated_at BEFORE UPDATE ON job_bids
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
