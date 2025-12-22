CREATE TABLE IF NOT EXISTS policy_audit (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(200) NOT NULL,
  file_path VARCHAR(400) NOT NULL,
  score INTEGER NOT NULL,
  rating VARCHAR(40) NOT NULL,
  matched_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  guardrail_note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
