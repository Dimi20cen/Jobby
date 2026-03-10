'use client';

import { useState } from 'react';

import { deleteApplication } from '@/lib/api';
import { ApplicationSummary } from '@/types';
import { Button, LinkButton } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';

type Props = {
  items: ApplicationSummary[];
  onDeleted: (id: string) => void;
};

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not yet';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

export default function ApplicationTable({ items, onDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Delete this application? This cannot be undone.')) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      await deleteApplication(id);
      onDeleted(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="applications-panel">
      <div className="section-heading">
        <div>
          <h2>All applications</h2>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {items.length === 0 ? (
        <div className="empty-state">
          <p>No applications yet.</p>
          <p className="muted">Create one manually or use the extension to capture a job page into Jobby.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Location</th>
                <th>CV</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-primary">
                      <LinkButton href={`/applications/${item.id}`} className="table-link" variant="secondary">
                        {item.company_name}
                      </LinkButton>
                      <span className="table-meta">Updated {formatDate(item.updated_at)}</span>
                    </div>
                  </td>
                  <td>{item.job_title}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{formatDate(item.applied_date)}</td>
                  <td>{item.location || 'Remote / n/a'}</td>
                  <td>{item.cv_used ? 'Saved' : 'Missing'}</td>
                  <td>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      {deletingId === item.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
