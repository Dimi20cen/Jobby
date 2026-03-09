export type GenerateResponse = {
  tailored_bullets: string[];
  cover_letter: string;
  application_id: string;
  created_at: string;
};

export type HistoryItem = {
  id: string;
  tailored_bullets: string[];
  cover_letter: string;
  created_at: string;
};
