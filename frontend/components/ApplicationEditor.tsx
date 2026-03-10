'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import AIWorkspace from '@/components/AIWorkspace';
import ApplicationActions from '@/components/ApplicationActions';
import ApplicationFormFields from '@/components/ApplicationFormFields';
import ApplicationHeader from '@/components/ApplicationHeader';
import Card from '@/components/ui/Card';
import { createApplication, deleteApplication, generateApplication, getApplication, updateApplication } from '@/lib/api';
import {
  ApplicationDetail,
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
  interview_questions: []
};

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
    interview_questions: detail.interview_questions
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
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(JSON.stringify(defaultForm));

  useEffect(() => {
    if (!existingApplicationId || isNew) {
      return;
    }
    const stableApplicationId = existingApplicationId;
    let active = true;
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const nextDetail = await getApplication(stableApplicationId);
        if (!active) return;
        setDetail(nextDetail);
        const normalized = normalize(nextDetail);
        setForm(normalized);
        setLastSavedSnapshot(JSON.stringify(normalized));
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

  const isDirty = JSON.stringify(form) !== lastSavedSnapshot;
  const canGenerate = Boolean(form.job_description.trim()) && !isNew;
  const hasAiOutputs = Boolean(form.cover_letter || form.interview_questions.length);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
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
      const normalized = normalize(updated);
      setForm(normalized);
      setLastSavedSnapshot(JSON.stringify(normalized));
      setNotice('Application saved.');
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
    setNotice(null);
    try {
      const generated = await generateApplication(existingApplicationId);
      setDetail(generated);
      const normalized = normalize(generated);
      setForm(normalized);
      setLastSavedSnapshot(JSON.stringify(normalized));
      setNotice('AI materials generated.');
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
    return (
      <main>
        <Card>
          <p>Loading application...</p>
        </Card>
      </main>
    );
  }

  return (
    <main>
      <ApplicationHeader
        title={isNew ? 'Create New Application' : form.job_title || 'Untitled role'}
        subtitle={
          isNew
            ? 'Create the record, then generate materials when you are ready.'
            : form.company_name || 'Company pending'
        }
        status={form.status}
        hasAiOutputs={hasAiOutputs}
        isDirty={isDirty}
      />
      {notice ? (
        <Card className="notice-panel">
          <p>{notice}</p>
        </Card>
      ) : null}
      {error ? (
        <Card>
          <p className="error">{error}</p>
        </Card>
      ) : null}
      <div className="editor-layout">
        <Card as="form" onSubmit={handleSubmit}>
          <ApplicationFormFields form={form} onFieldChange={setField} />
          <ApplicationActions
            isNew={isNew}
            saving={saving}
            generating={generating}
            canGenerate={canGenerate}
            isDirty={isDirty}
            onGenerate={handleGenerate}
            onDelete={handleDelete}
          />
        </Card>

        <AIWorkspace detail={detail} form={form} generating={generating} onFieldChange={setField} />
      </div>
    </main>
  );
}
