ALTER TABLE organization_memberships
  ADD CONSTRAINT organization_memberships_organization_user_unique
  UNIQUE (organization_id, user_id);

ALTER TABLE investigations
  ADD CONSTRAINT investigations_requester_membership_fk
  FOREIGN KEY (organization_id, requested_by)
  REFERENCES organization_memberships (organization_id, user_id);
