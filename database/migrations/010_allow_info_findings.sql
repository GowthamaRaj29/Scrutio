ALTER TABLE investigation_findings
  DROP CONSTRAINT investigation_findings_severity_check;

ALTER TABLE investigation_findings
  ADD CONSTRAINT investigation_findings_severity_check
  CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
