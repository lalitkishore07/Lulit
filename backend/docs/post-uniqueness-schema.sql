-- Post digital uniqueness schema additions
-- Compatible with Spring JPA `ddl-auto=update` models.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_size_bytes BIGINT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_sha256 VARCHAR(64);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_perceptual_hash VARCHAR(64);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_embedding_json CLOB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS duplicate_status VARCHAR(40);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS duplicate_confidence_score DOUBLE PRECISION;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS duplicate_reference_post_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_posts_sha256 ON posts (media_sha256);
CREATE INDEX IF NOT EXISTS idx_posts_ipfs_cid ON posts (ipfs_cid);
CREATE INDEX IF NOT EXISTS idx_posts_perceptual_hash ON posts (media_perceptual_hash);
