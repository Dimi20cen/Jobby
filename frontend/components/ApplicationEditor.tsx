'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import AIWorkspace from '@/components/AIWorkspace';
import ApplicationActions from '@/components/ApplicationActions';
import ApplicationFormFields from '@/components/ApplicationFormFields';
import GmailPanel from '@/components/GmailPanel';
import ApplicationHeader from '@/components/ApplicationHeader';
import Card from '@/components/ui/Card';
import {
  createApplication,
  deleteApplication,
  generateApplication,
  getApplication,
  getApplicationEmailLinks,
  getGmailSyncJob,
  linkApplicationEmailThread,
  rejectApplicationEmailThread,
  startGmailConnect,
  startGmailSync,
  unlinkApplicationEmailThread,
  updateApplication
} from '@/lib/api';
import {
  ApplicationEmailLinks,
  ApplicationDetail,
  CreateApplicationRequest,
  GmailSyncJob,
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
  const [emailLinks, setEmailLinks] = useState<ApplicationEmailLinks | null>(null);
  const [gmailSyncJob, setGmailSyncJob] = useState<GmailSyncJob | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [gmailLoading, setGmailLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [mutatingThreadId, setMutatingThreadId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!existingApplicationId || isNew) {
      setGmailLoading(false);
      return;
    }
    const stableApplicationId = existingApplicationId;
    let active = true;
    async function loadEmailLinks(): Promise<void> {
      setGmailLoading(true);
      try {
        const nextLinks = await getApplicationEmailLinks(stableApplicationId);
        if (!active) return;
        setEmailLinks(nextLinks);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load Gmail links');
      } finally {
        if (active) {
          setGmailLoading(false);
        }
      }
    }
    loadEmailLinks();
    return () => {
      active = false;
    };
  }, [existingApplicationId, isNew]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authState = params.get('auth');
    if (authState === 'connected') {
      setNotice('Gmail connected. Refresh threads to load recruiter emails.');
      router.replace(window.location.pathname);
    }
  }, [router]);

  useEffect(() => {
    if (!gmailSyncJob || !['queued', 'running'].includes(gmailSyncJob.status)) {
      return;
    }

    let active = true;
    const jobId = gmailSyncJob.id;

    async function poll(): Promise<void> {
      try {
        const nextJob = await getGmailSyncJob(jobId);
        if (!active) return;
        setGmailSyncJob(nextJob);

        if (nextJob.status === 'succeeded') {
          setSyncingGmail(false);
          if (existingApplicationId) {
            const nextLinks = await getApplicationEmailLinks(existingApplicationId);
            if (!active) return;
            setEmailLinks(nextLinks);
          }
          setNotice(
            `Gmail refreshed. Synced ${nextJob.threads_synced ?? 0} threads and updated ${nextJob.suggestions_updated ?? 0} suggestions.`
          );
        } else if (nextJob.status === 'failed') {
          setSyncingGmail(false);
          setError(nextJob.error || 'Could not refresh Gmail threads');
        }
      } catch (err) {
        if (!active) return;
        setSyncingGmail(false);
        setError(err instanceof Error ? err.message : 'Could not refresh Gmail threads');
      }
    }

    const intervalId = window.setInterval(() => {
      void poll();
    }, 2000);

    void poll();

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [gmailSyncJob, existingApplicationId]);

  function setField<K extends keyof CreateApplicationRequest>(key: K, value: CreateApplicationRequest[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const isDirty = JSON.stringify(form) !== lastSavedSnapshot;
  const hasJobDescription = Boolean(form.job_description.trim());
  const canGenerate = !isNew && hasJobDescription && !isDirty;
  const headerMeta = [form.company_name, form.location, isNew ? null : form.status]
    .map((item) => item?.trim())
    .filter(Boolean) as string[];

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

  async function handleGmailConnect(): Promise<void> {
    setError(null);
    try {
      const response = await startGmailConnect(window.location.pathname);
      window.location.href = response.auth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Gmail connect flow');
    }
  }

  async function handleGmailSync(): Promise<void> {
    setSyncingGmail(true);
    setError(null);
    setNotice('Gmail refresh started. You can keep working while threads update in the background.');
    try {
      const job = await startGmailSync();
      setGmailSyncJob(job);
      if (job.status === 'failed') {
        setSyncingGmail(false);
        setError(job.error || 'Could not refresh Gmail threads');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh Gmail threads');
      setSyncingGmail(false);
    }
  }

  async function handleEmailLinkAction(
    threadId: string,
    action: 'link' | 'reject' | 'unlink'
  ): Promise<void> {
    if (!existingApplicationId) return;
    setMutatingThreadId(threadId);
    setError(null);
    try {
      const nextLinks =
        action === 'link'
          ? await linkApplicationEmailThread(existingApplicationId, threadId)
          : action === 'reject'
            ? await rejectApplicationEmailThread(existingApplicationId, threadId)
            : await unlinkApplicationEmailThread(existingApplicationId, threadId);
      setEmailLinks(nextLinks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update Gmail thread link');
    } finally {
      setMutatingThreadId(null);
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
      <div className="editor-shell">
        <ApplicationHeader
          title={isNew ? 'Create New Application' : form.job_title || 'Untitled role'}
          meta={headerMeta}
        />
        {notice ? (
          <Card className="notice-panel banner-panel">
            <p>{notice}</p>
          </Card>
        ) : null}
        {error ? (
          <Card className="error-panel banner-panel">
            <p className="error">{error}</p>
          </Card>
        ) : null}
        <div className="editor-layout">
          <div className="editor-main-column">
            <Card as="form" className="editor-form-panel" onSubmit={handleSubmit}>
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

            <GmailPanel
              isNew={isNew}
              data={emailLinks}
              loading={gmailLoading}
              syncing={syncingGmail}
              syncMessage={
                syncingGmail
                  ? gmailSyncJob?.status === 'queued'
                    ? 'Gmail refresh is queued and will start shortly.'
                    : 'Gmail refresh is running in the background. This page will update when it finishes.'
                  : null
              }
              mutatingThreadId={mutatingThreadId}
              onConnect={handleGmailConnect}
              onSync={handleGmailSync}
              onLink={(threadId) => void handleEmailLinkAction(threadId, 'link')}
              onReject={(threadId) => void handleEmailLinkAction(threadId, 'reject')}
              onUnlink={(threadId) => void handleEmailLinkAction(threadId, 'unlink')}
            />
          </div>

          <AIWorkspace
            isNew={isNew}
            detail={detail}
            form={form}
            generating={generating}
            onFieldChange={setField}
          />
        </div>
      </div>
    </main>
  );
}
