'use client';

import { useEffect, useMemo, useState } from 'react';

import ActivityGrid from '@/components/ActivityGrid';
import ApplicationTable from '@/components/ApplicationTable';
import ExtensionCard from '@/components/ExtensionCard';
import Card from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Field';
import { getActivity, getApplications } from '@/lib/api';
import { ApplicationActivityPoint, ApplicationSummary, ApplicationStatus } from '@/types';

const statusFilters: Array<{ label: string; value: '' | ApplicationStatus }> = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Applied', value: 'applied' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' }
];

export default function HomePage() {
  const [items, setItems] = useState<ApplicationSummary[]>([]);
  const [activity, setActivity] = useState<ApplicationActivityPoint[]>([]);
  const [statusFilter, setStatusFilter] = useState<'' | ApplicationStatus>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const [applications, activityItems] = await Promise.all([
          getApplications(statusFilter || undefined),
          getActivity(90)
        ]);
        if (!active) return;
        setItems(applications);
        setActivity(activityItems);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load dashboard');
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
  }, [statusFilter]);

  const totals = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) => ['draft', 'applied', 'interview', 'offer'].includes(item.status)).length,
      applied: items.filter((item) => item.status === 'applied').length
    };
  }, [items]);

  return (
    <main>
      <Card className="hero">
        <div>
          <p className="eyebrow">Job Application Manager</p>
          <h1>Track every application, edit your materials, and keep momentum visible.</h1>
          <p className="muted">
            Jobby now works like an operating system for your job hunt: one dashboard, one record per application,
            and AI support inside each record when you need it.
          </p>
        </div>
        <div className="hero-actions">
          <LinkButton href="/applications/new">
            Create Application
          </LinkButton>
          <span className="metric-card">
            <strong>{totals.total}</strong>
            <span>Total tracked</span>
          </span>
          <span className="metric-card">
            <strong>{totals.applied}</strong>
            <span>Applied</span>
          </span>
          <span className="metric-card">
            <strong>{totals.active}</strong>
            <span>Active pipeline</span>
          </span>
        </div>
      </Card>

      <div className="toolbar">
        <SelectField
          label="Status filter"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as '' | ApplicationStatus)}
          options={statusFilters.map((filter) => ({ label: filter.label, value: filter.value }))}
        />
      </div>

      {error ? (
        <Card>
          <p className="error">{error}</p>
        </Card>
      ) : null}
      {loading ? (
        <Card>
          <p>Loading dashboard...</p>
        </Card>
      ) : null}
      {!loading ? <ApplicationTable items={items} onDeleted={(id) => setItems((current) => current.filter((item) => item.id !== id))} /> : null}

      <div className="dashboard-grid">
        <ActivityGrid items={activity} />
        <ExtensionCard />
      </div>
    </main>
  );
}
