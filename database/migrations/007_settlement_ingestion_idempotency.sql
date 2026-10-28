ALTER TABLE settlements
  ADD COLUMN source_event_id VARCHAR(150);

ALTER TABLE settlements
  ADD CONSTRAINT settlements_source_event_unique
  UNIQUE (organization_id, source_event_id);
