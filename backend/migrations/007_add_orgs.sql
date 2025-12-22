CREATE TABLE IF NOT EXISTS organization (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  api_key VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  default_org_id INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organization) THEN
    INSERT INTO organization (name, api_key)
    VALUES ('Default', 'dev-api-key')
    RETURNING id INTO default_org_id;
  ELSE
    SELECT id INTO default_org_id FROM organization LIMIT 1;
  END IF;

  ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS org_id INTEGER;
  UPDATE audit_log SET org_id = default_org_id WHERE org_id IS NULL;
  ALTER TABLE audit_log ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE audit_log ADD CONSTRAINT audit_log_org_fk FOREIGN KEY (org_id) REFERENCES organization(id);

  ALTER TABLE compliance_score ADD COLUMN IF NOT EXISTS org_id INTEGER;
  UPDATE compliance_score SET org_id = default_org_id WHERE org_id IS NULL;
  ALTER TABLE compliance_score ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE compliance_score ADD CONSTRAINT compliance_score_org_fk FOREIGN KEY (org_id) REFERENCES organization(id);

  ALTER TABLE regulatory_alert ADD COLUMN IF NOT EXISTS org_id INTEGER;
  UPDATE regulatory_alert SET org_id = default_org_id WHERE org_id IS NULL;
  ALTER TABLE regulatory_alert ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE regulatory_alert ADD CONSTRAINT regulatory_alert_org_fk FOREIGN KEY (org_id) REFERENCES organization(id);

  ALTER TABLE usage_event ADD COLUMN IF NOT EXISTS org_id INTEGER;
  UPDATE usage_event SET org_id = default_org_id WHERE org_id IS NULL;
  ALTER TABLE usage_event ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE usage_event ADD CONSTRAINT usage_event_org_fk FOREIGN KEY (org_id) REFERENCES organization(id);

  ALTER TABLE compliance_checklist ADD COLUMN IF NOT EXISTS org_id INTEGER;
  UPDATE compliance_checklist SET org_id = default_org_id WHERE org_id IS NULL;
  ALTER TABLE compliance_checklist ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE compliance_checklist ADD CONSTRAINT compliance_checklist_org_fk FOREIGN KEY (org_id) REFERENCES organization(id);

  ALTER TABLE policy_audit ADD COLUMN IF NOT EXISTS org_id INTEGER;
  UPDATE policy_audit SET org_id = default_org_id WHERE org_id IS NULL;
  ALTER TABLE policy_audit ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE policy_audit ADD CONSTRAINT policy_audit_org_fk FOREIGN KEY (org_id) REFERENCES organization(id);

  ALTER TABLE scraper_run ADD COLUMN IF NOT EXISTS org_id INTEGER;
  UPDATE scraper_run SET org_id = default_org_id WHERE org_id IS NULL;
  ALTER TABLE scraper_run ALTER COLUMN org_id SET NOT NULL;
  ALTER TABLE scraper_run ADD CONSTRAINT scraper_run_org_fk FOREIGN KEY (org_id) REFERENCES organization(id);
END $$;
