ALTER TABLE compliance_checklist
ADD COLUMN IF NOT EXISTS industry VARCHAR(60) NOT NULL DEFAULT 'general';
