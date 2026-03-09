export type GenerateResponse = {
  tailored_bullets: string[];
  cover_letter: string;
  interview_questions: string[];
  relevance_score: number;
  jd_coverage: string[];
  risk_flags: string[];
  used_model: string;
  application_id: string;
  created_at: string;
};

export type HistoryItem = {
  id: string;
  tailored_bullets: string[];
  cover_letter: string;
  created_at: string;
};
