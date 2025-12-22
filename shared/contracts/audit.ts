export type AuditLogCreate = {
  action: string;
  actor: string;
  target?: string | null;
  outcome?: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export type AuditLogRead = AuditLogCreate & {
  id: number;
  created_at: string;
};
