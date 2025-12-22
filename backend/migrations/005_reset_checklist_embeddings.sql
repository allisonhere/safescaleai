DROP TABLE IF EXISTS compliance_checklist;

CREATE TABLE compliance_checklist (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organization(id),
  text TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
