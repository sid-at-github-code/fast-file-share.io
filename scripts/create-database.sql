-- Create the file_shares table
CREATE TABLE IF NOT EXISTS file_shares (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    content_type VARCHAR(200) NOT NULL,
    access_key VARCHAR(50) UNIQUE NOT NULL,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 10,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    file_hash VARCHAR(64) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_shares_access_key ON file_shares(access_key);
CREATE INDEX IF NOT EXISTS idx_file_shares_created_at ON file_shares(created_at);
CREATE INDEX IF NOT EXISTS idx_file_shares_expires_at ON file_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_file_shares_is_active ON file_shares(is_active);

-- Create a cleanup function for expired files
CREATE OR REPLACE FUNCTION cleanup_expired_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark expired files as inactive
    UPDATE file_shares 
    SET is_active = FALSE 
    WHERE expires_at < CURRENT_TIMESTAMP 
    AND is_active = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get file statistics
CREATE OR REPLACE FUNCTION get_file_stats()
RETURNS TABLE(
    total_files BIGINT,
    active_files BIGINT,
    total_downloads BIGINT,
    total_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_files,
        SUM(download_count) as total_downloads,
        SUM(file_size) as total_size
    FROM file_shares;
END;
$$ LANGUAGE plpgsql;
