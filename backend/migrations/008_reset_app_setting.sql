DROP TABLE IF EXISTS app_setting;

CREATE TABLE app_setting (
  org_id INTEGER NOT NULL REFERENCES organization(id),
  key VARCHAR(120) NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, key)
);
