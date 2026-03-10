'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import ActivityGrid from '@/components/ActivityGrid';
import ApplicationTable from '@/components/ApplicationTable';
import ExtensionCard from '@/components/ExtensionCard';
import Card from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { getActivity, getApplications } from '@/lib/api';
import { ApplicationActivityPoint, ApplicationSummary, ApplicationStatus } from '@/types';

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

  return (
    <main>
      <div className="dashboard-topbar dashboard-shell-header">
        <div className="brand-lockup" aria-label="Jobby">
          <Image src="/brand/logo.svg" alt="Jobby" width={140} height={40} priority />
        </div>
        <LinkButton href="/applications/new">New Application</LinkButton>
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
      {!loading ? (
        <ApplicationTable
          items={items}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onDeleted={(id) => setItems((current) => current.filter((item) => item.id !== id))}
        />
      ) : null}

      <ActivityGrid items={activity} />
      <ExtensionCard />
    </main>
  );
}
