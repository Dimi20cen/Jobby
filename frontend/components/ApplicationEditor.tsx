'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { createApplication, deleteApplication, generateApplication, getApplication, updateApplication } from '@/lib/api';
import {
  ApplicationDetail,
  ApplicationStatus,
  CreateApplicationRequest,
  UpdateApplicationRequest
} from '@/types';

type Props = {
  applicationId?: string;
  isNew?: boolean;
};

const defaultForm: CreateApplicationRequest = {
  company_name: '',
  job_title: '',
  location: '',
  status: 'draft',
  applied_date: null,
  job_url: '',
  job_description: '',
  cv_used: '',
  notes: '',
  cover_letter: '',
  interview_questions: [],
  tailored_bullets: []
};

const statuses: ApplicationStatus[] = ['draft', 'applied', 'interview', 'offer', 'rejected', 'archived'];

function normalize(detail: ApplicationDetail): CreateApplicationRequest {
  return {
    company_name: detail.company_name,
    job_title: detail.job_title,
    location: detail.location || '',
    status: detail.status,
    applied_date: detail.applied_date,
    job_url: detail.job_url || '',
    job_description: detail.job_description,
    cv_used: detail.cv_used,
    notes: detail.notes,
    cover_letter: detail.cover_letter,
    interview_questions: detail.interview_questions,
    tailored_bullets: detail.tailored_bullets
  };
}

export default function ApplicationEditor({ applicationId, isNew = false }: Props) {
  const router = useRouter();
  const existingApplicationId = applicationId ?? null;
  const [form, setForm] = useState<CreateApplicationRequest>(defaultForm);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existingApplicationId || isNew) {
      return;
    }
    const applicationId = existingApplicationId;
    let active = true;
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const nextDetail = await getApplication(applicationId);
        if (!active) return;
        setDetail(nextDetail);
        setForm(normalize(nextDetail));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load application');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [existingApplicationId, isNew]);

  function setField<K extends keyof CreateApplicationRequest>(key: K, value: CreateApplicationRequest[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await createApplication(form);
        router.push(`/applications/${created.id}`);
        router.refresh();
        return;
      }
      if (!existingApplicationId) {
        throw new Error('Missing application id');
      }
      const payload: UpdateApplicationRequest = { ...form };
      const updated = await updateApplication(existingApplicationId, payload);
      setDetail(updated);
      setForm(normalize(updated));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate(): Promise<void> {
    if (!existingApplicationId) return;
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateApplication(existingApplicationId);
      setDetail(generated);
      setForm(normalize(generated));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!existingApplicationId) return;
    if (!window.confirm('Delete this application? This cannot be undone.')) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteApplication(existingApplicationId);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setSaving(false);
    }
  }

  if (loading) {
    return <main><section className="panel"><p>Loading application...</p></section></main>;
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Application Detail</p>
          <h1>{isNew ? 'Create New Application' : form.job_title || 'Untitled role'}</h1>
          <p className="muted">
            {isNew ? 'Create the record first, then generate AI assets inside it.' : form.company_name || 'Company pending'}
          </p>
        </div>
        <Link className="button-link secondary-link" href="/">
          Back to Dashboard
        </Link>
      </div>
      {error ? <p className="panel error">{error}</p> : null}
      <div className="editor-layout">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Company
              <input value={form.company_name} onChange={(e) => setField('company_name', e.target.value)} required />
            </label>
            <label>
              Job Title
              <input value={form.job_title} onChange={(e) => setField('job_title', e.target.value)} required />
            </label>
            <label>
              Location
              <input value={form.location || ''} onChange={(e) => setField('location', e.target.value)} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => setField('status', e.target.value as ApplicationStatus)}>
                {statuses.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {statusValue}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Applied Date
              <input
                type="date"
                value={form.applied_date || ''}
                onChange={(e) => setField('applied_date', e.target.value || null)}
              />
            </label>
            <label>
              Job URL
              <input value={form.job_url || ''} onChange={(e) => setField('job_url', e.target.value)} />
            </label>
          </div>

          <label>
            Job Description
            <textarea value={form.job_description} onChange={(e) => setField('job_description', e.target.value)} />
          </label>
          <label>
            CV Used
            <textarea value={form.cv_used} onChange={(e) => setField('cv_used', e.target.value)} />
          </label>
          <label>
            Notes
            <textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </label>
          <div className="action-row">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isNew ? 'Create Application' : 'Save Changes'}
            </button>
            {!isNew ? (
              <button type="button" className="ghost-button" disabled={generating} onClick={handleGenerate}>
                {generating ? 'Generating...' : 'Generate AI Assets'}
              </button>
            ) : null}
            {!isNew ? (
              <button type="button" className="ghost-button danger-button" disabled={saving} onClick={handleDelete}>
                Delete Application
              </button>
            ) : null}
          </div>
        </form>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">AI Workspace</p>
              <h2>Outputs and Evaluation</h2>
            </div>
            {detail?.used_model ? <p className="muted">Model: {detail.used_model}</p> : null}
          </div>
          <p>
            <strong>Relevance score:</strong> {detail?.relevance_score ?? 'Not generated'}
          </p>
          <p>
            <strong>JD coverage:</strong> {detail?.jd_coverage.join(', ') || 'Not generated'}
          </p>
          <p>
            <strong>Risk flags:</strong> {detail?.risk_flags.join(', ') || 'Not generated'}
          </p>
          <label>
            Tailored Bullets
            <textarea
              value={form.tailored_bullets.join('\n')}
              onChange={(e) => setField('tailored_bullets', e.target.value.split('\n').map((line) => line.trim()).filter(Boolean))}
            />
          </label>
          <label>
            Cover Letter
            <textarea value={form.cover_letter} onChange={(e) => setField('cover_letter', e.target.value)} />
          </label>
          <label>
            Interview Questions
            <textarea
              value={form.interview_questions.join('\n')}
              onChange={(e) =>
                setField(
                  'interview_questions',
                  e.target.value.split('\n').map((line) => line.trim()).filter(Boolean)
                )
              }
            />
          </label>
        </section>
      </div>
    </main>
  );
}
