export type ComplianceScore = {
  score: number;
  rating: string;
};

export type RegulatoryAlert = {
  id: string;
  title: string;
  summary: string;
  severity: string;
  source_url: string;
  published_at: string;
};

export type ComplianceDashboard = {
  score: ComplianceScore;
  active_alerts: RegulatoryAlert[];
};
