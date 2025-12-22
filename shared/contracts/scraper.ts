export type ScraperRunRequest = {
  urls?: string[];
};

export type ScraperRunResponse = {
  scanned: number;
  alerts_created: number;
  notes: string[];
};

export type ScraperStatus = {
  enabled: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  status?: string | null;
  scanned: number;
  alerts_created: number;
  notes: string[];
};
