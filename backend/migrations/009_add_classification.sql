ALTER TABLE compliance_checklist ADD COLUMN IF NOT EXISTS doc_type VARCHAR(80) NOT NULL DEFAULT 'general';
ALTER TABLE compliance_checklist ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(40) NOT NULL DEFAULT 'general';

ALTER TABLE policy_audit ADD COLUMN IF NOT EXISTS doc_type VARCHAR(80) NOT NULL DEFAULT 'general';
ALTER TABLE policy_audit ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(40) NOT NULL DEFAULT 'general';
ALTER TABLE policy_audit ADD COLUMN IF NOT EXISTS classifier_notes JSONB NOT NULL DEFAULT '{}'::jsonb;
