ALTER TABLE payments
  ADD COLUMN provider VARCHAR(100),
  ADD COLUMN provider_reference_id VARCHAR(255);

CREATE INDEX payments_organization_provider_reference_idx
  ON payments (organization_id, provider_reference_id)
  WHERE provider_reference_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO scrutio_app;
