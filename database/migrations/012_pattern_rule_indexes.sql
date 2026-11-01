CREATE INDEX provider_payment_events_organization_status_observed_idx
  ON provider_payment_events (organization_id, observed_status, observed_at, payment_id);

CREATE INDEX webhook_events_organization_status_received_idx
  ON webhook_events (organization_id, processing_status, received_at, event_id);
