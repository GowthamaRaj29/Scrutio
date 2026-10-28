CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN (
    'PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELLED', 'FULFILLING', 'FULFILLED'
  )),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, order_id),
  UNIQUE (organization_id, id)
);

ALTER TABLE payments
  ADD COLUMN order_id VARCHAR(100);

ALTER TABLE payments
  ADD CONSTRAINT payments_order_tenant_fk
  FOREIGN KEY (organization_id, order_id)
  REFERENCES orders (organization_id, order_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id VARCHAR(150) NOT NULL,
  payment_id VARCHAR(100),
  event_type VARCHAR(100) NOT NULL,
  signature_verified BOOLEAN NOT NULL,
  processing_status VARCHAR(30) NOT NULL CHECK (processing_status IN (
    'RECEIVED', 'PROCESSED', 'FAILED'
  )),
  retry_count INT NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  received_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, event_id),
  FOREIGN KEY (organization_id, payment_id)
    REFERENCES payments (organization_id, payment_id)
);

CREATE INDEX webhook_events_payment_idx
  ON webhook_events (organization_id, payment_id, received_at DESC);

CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_code VARCHAR(100) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, account_code),
  UNIQUE (organization_id, id)
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id VARCHAR(100),
  account_id UUID NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING', 'POSTED', 'REVERSED')),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL,
  posted_at TIMESTAMPTZ,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, payment_id)
    REFERENCES payments (organization_id, payment_id),
  FOREIGN KEY (organization_id, account_id)
    REFERENCES ledger_accounts (organization_id, id)
);

CREATE INDEX ledger_entries_payment_idx
  ON ledger_entries (organization_id, payment_id, created_at DESC);

CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ledger_entry_id UUID NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (organization_id, ledger_entry_id)
    REFERENCES ledger_entries (organization_id, id)
    ON DELETE CASCADE
);

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  settlement_id VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING', 'SETTLED', 'FAILED')),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL,
  settlement_date DATE NOT NULL,
  settled_at TIMESTAMPTZ,
  utr_number VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, settlement_id),
  UNIQUE (organization_id, id)
);

CREATE TABLE settlement_payments (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  settlement_id UUID NOT NULL,
  payment_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, settlement_id, payment_id),
  FOREIGN KEY (organization_id, settlement_id)
    REFERENCES settlements (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, payment_id)
    REFERENCES payments (organization_id, payment_id)
);

CREATE TABLE investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  payment_id VARCHAR(100),
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'
  )),
  rule_set_version VARCHAR(100) NOT NULL,
  evaluation_timestamp TIMESTAMPTZ NOT NULL,
  input_fingerprint VARCHAR(64) NOT NULL,
  result JSONB,
  error_code VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, payment_id)
    REFERENCES payments (organization_id, payment_id)
);

CREATE INDEX investigations_org_created_idx
  ON investigations (organization_id, created_at DESC);

CREATE TABLE investigation_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL,
  rule_id VARCHAR(20) NOT NULL,
  rule_version VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status VARCHAR(30) NOT NULL CHECK (status IN ('MATCH', 'NO_MATCH', 'INSUFFICIENT_EVIDENCE')),
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, investigation_id, rule_id),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, investigation_id)
    REFERENCES investigations (organization_id, id)
    ON DELETE CASCADE
);

CREATE TABLE investigation_evidence_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL,
  finding_id UUID NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(150) NOT NULL,
  field_name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, finding_id, source_type, source_id, field_name),
  FOREIGN KEY (organization_id, investigation_id)
    REFERENCES investigations (organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, finding_id)
    REFERENCES investigation_findings (organization_id, id)
    ON DELETE CASCADE
);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'orders', 'webhook_events', 'ledger_accounts', 'ledger_entries',
    'journal_lines', 'settlements', 'settlement_payments',
    'investigations', 'investigation_findings', 'investigation_evidence_references'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (
         organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::UUID
       ) WITH CHECK (
         organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::UUID
       )',
      table_name || '_organization_isolation',
      table_name
    );
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON
  orders, webhook_events, ledger_accounts, ledger_entries, journal_lines,
  settlements, settlement_payments, investigations, investigation_findings,
  investigation_evidence_references TO scrutio_app;
