import { GenerateResponse, HistoryItem } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function generate(jobDescription: string, cvText: string): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jobDescription, cv_text: cvText })
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || 'Generation failed');
  }

  return res.json();
}

export async function getApplications(limit = 5): Promise<HistoryItem[]> {
  const res = await fetch(`${API_BASE}/applications?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Could not fetch history');
  }
  const data = await res.json();
  return data.items as HistoryItem[];
}
