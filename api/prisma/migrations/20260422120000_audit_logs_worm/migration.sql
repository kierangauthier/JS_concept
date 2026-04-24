-- V5.3 — Audit logs become effectively WORM (Write Once, Read Many).
--
-- Business rule: an audit entry must never be edited or silently dropped.
-- We enforce this at the database level with a trigger, so even a direct
-- SQL session (e.g. ad-hoc psql with the migration user) cannot tamper
-- with the trail.
--
-- Note: INSERTs remain allowed so AuditService keeps working, and TRUNCATE
-- on the whole table is disallowed too. Legal retention (3 years minimum —
-- see docs/legal/registre-traitements.md) must be handled by a documented
-- operator procedure, never by casual UPDATE/DELETE.

CREATE OR REPLACE FUNCTION audit_logs_reject_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is write-once: % not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON "audit_logs";
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION audit_logs_reject_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_delete ON "audit_logs";
CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION audit_logs_reject_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_truncate ON "audit_logs";
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_logs_reject_mutation();
