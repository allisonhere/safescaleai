export type PolicyGap = {
  checklist_item: string;
  reason: string;
};

export type PolicyAuditBase = {
  score: number;
  rating: string;
  matched_items: string[];
  gaps: PolicyGap[];
  guardrail_note: string;
  doc_type?: string;
  jurisdiction?: string;
  classifier_notes?: Record<string, string>;
};

export type PolicyAuditRecord = PolicyAuditBase & {
  id: number;
  filename: string;
  created_at: string;
};
