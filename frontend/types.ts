export type ApplicationStatus =
  | 'draft'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'archived';

export type ApplicationSummary = {
  id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  status: ApplicationStatus;
  applied_date: string | null;
  cv_used: string;
  created_at: string;
  updated_at: string;
};

export type ApplicationDetail = ApplicationSummary & {
  job_url: string | null;
  job_description: string;
  notes: string;
  cover_letter: string;
  interview_questions: string[];
  used_model: string | null;
  relevance_score: number | null;
  jd_coverage: string[];
  risk_flags: string[];
};

export type ApplicationActivityPoint = {
  day: string;
  count: number;
};

export type GmailConnectionStatus = {
  connected: boolean;
  email_address: string | null;
  connected_at: string | null;
  has_pending_auth: boolean;
};

export type ApplicationEmailLinkStatus = 'suggested' | 'linked' | 'rejected';

export type ApplicationEmailThread = {
  thread_id: string;
  subject: string;
  participants_summary: string;
  snippet: string;
  last_message_at: string | null;
  message_count: number;
  gmail_url: string;
  status: ApplicationEmailLinkStatus;
  match_score: number;
  match_reasons: string[];
};

export type ApplicationEmailLinks = {
  connection: GmailConnectionStatus;
  suggested: ApplicationEmailThread[];
  linked: ApplicationEmailThread[];
  rejected_thread_ids: string[];
};

export type GmailConnectStartResponse = {
  auth_url: string;
};

export type GmailSyncResponse = {
  connection: GmailConnectionStatus;
  threads_synced: number;
  suggestions_updated: number;
};

export type CreateApplicationRequest = {
  company_name: string;
  job_title: string;
  location: string | null;
  status: ApplicationStatus;
  applied_date: string | null;
  job_url: string | null;
  job_description: string;
  cv_used: string;
  notes: string;
  cover_letter: string;
  interview_questions: string[];
};

export type UpdateApplicationRequest = Partial<CreateApplicationRequest>;
