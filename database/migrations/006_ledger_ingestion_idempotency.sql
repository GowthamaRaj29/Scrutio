ALTER TABLE ledger_entries
  ADD COLUMN source_event_id VARCHAR(150);

ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_entries_source_event_unique
  UNIQUE (organization_id, source_event_id);
