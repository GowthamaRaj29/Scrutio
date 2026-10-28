CREATE INDEX payments_organization_order_status_idx
  ON payments (organization_id, order_id, status);

CREATE INDEX settlement_payments_organization_payment_idx
  ON settlement_payments (organization_id, payment_id, settlement_id);
