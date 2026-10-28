CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  payment_id VARCHAR(100) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL CHECK (status IN (
    'INITIATED', 'PENDING', 'PROCESSING', 'AUTHORIZED', 'SUCCESS', 'FAILED',
    'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED', 'CANCELLED', 'EXPIRED'
  )),
  order_status VARCHAR(50),
  webhook_processed BOOLEAN NOT NULL DEFAULT FALSE,
  ledger_entry_present BOOLEAN NOT NULL DEFAULT FALSE,
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, payment_id)
);

CREATE INDEX payments_organization_payment_id_idx
  ON payments (organization_id, payment_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

CREATE POLICY payments_organization_isolation ON payments
  USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::UUID)
  WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), '')::UUID);

GRANT SELECT, INSERT, UPDATE, DELETE ON organizations, payments TO scrutio_app;
