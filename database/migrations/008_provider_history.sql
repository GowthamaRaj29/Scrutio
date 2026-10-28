CREATE TABLE provider_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id VARCHAR(100) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  provider_event_id VARCHAR(255) NOT NULL,
  provider_reference_id VARCHAR(255),
  observed_status VARCHAR(50) NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(18, 2),
  currency VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider_event_id),
  FOREIGN KEY (organization_id, payment_id)
    REFERENCES payments (organization_id, payment_id)
);

CREATE INDEX provider_payment_events_payment_idx
  ON provider_payment_events (organization_id, payment_id, observed_at DESC);

CREATE INDEX provider_payment_events_reference_idx
  ON provider_payment_events (organization_id, provider_reference_id)
  WHERE provider_reference_id IS NOT NULL;

ALTER TABLE provider_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payment_events FORCE ROW LEVEL SECURITY;

CREATE POLICY provider_payment_events_organization_isolation
  ON provider_payment_events
  USING (
    organization_id = NULLIF(current_setting('app.organization_id', true), '')::UUID
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.organization_id', true), '')::UUID
  );

GRANT SELECT, INSERT ON provider_payment_events TO scrutio_app;
