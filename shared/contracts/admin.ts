export type EmbeddingThreshold = {
  value: number;
};

export type IndustrySetting = {
  value: string;
};

export type OrgResetResponse = {
  audits: number;
  alerts: number;
  scores: number;
  usage_events: number;
  scraper_runs: number;
  audit_logs: number;
  settings: number;
  checklists_cleared: number;
  checklist_seeded: number;
};
