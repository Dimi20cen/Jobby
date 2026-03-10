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
