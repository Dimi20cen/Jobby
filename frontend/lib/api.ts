import {
  ApplicationActivityPoint,
  ApplicationDetail,
  ApplicationSummary,
  CreateApplicationRequest,
  UpdateApplicationRequest
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || fallbackMessage);
  }
  return response.json() as Promise<T>;
}

export async function getApplications(status?: string): Promise<ApplicationSummary[]> {
  const url = new URL(`${API_BASE}/applications`);
  if (status) {
    url.searchParams.set('status', status);
  }
  return parseResponse<{ items: ApplicationSummary[] }>(
    await fetch(url.toString(), { cache: 'no-store' }),
    'Could not fetch applications'
  ).then((data) => data.items);
}

export async function getActivity(days = 90): Promise<ApplicationActivityPoint[]> {
  const url = new URL(`${API_BASE}/applications/activity`);
  url.searchParams.set('days', String(days));
  return parseResponse<{ items: ApplicationActivityPoint[] }>(
    await fetch(url.toString(), { cache: 'no-store' }),
    'Could not fetch activity'
  ).then((data) => data.items);
}

export async function getApplication(id: string): Promise<ApplicationDetail> {
  return parseResponse<ApplicationDetail>(
    await fetch(`${API_BASE}/applications/${id}`, { cache: 'no-store' }),
    'Could not fetch application'
  );
}

export async function createApplication(payload: CreateApplicationRequest): Promise<ApplicationDetail> {
  return parseResponse<ApplicationDetail>(
    await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
    'Could not create application'
  );
}

export async function updateApplication(
  id: string,
  payload: UpdateApplicationRequest
): Promise<ApplicationDetail> {
  return parseResponse<ApplicationDetail>(
    await fetch(`${API_BASE}/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
    'Could not update application'
  );
}

export async function deleteApplication(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/applications/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || 'Could not delete application');
  }
}

export async function generateApplication(id: string): Promise<ApplicationDetail> {
  return parseResponse<ApplicationDetail>(
    await fetch(`${API_BASE}/applications/${id}/generate`, {
      method: 'POST'
    }),
    'Could not generate application assets'
  );
}
