'use client';

import Link from 'next/link';
import { useState } from 'react';

import { deleteApplication } from '@/lib/api';
import { ApplicationSummary } from '@/types';

type Props = {
  items: ApplicationSummary[];
  onDeleted: (id: string) => void;
};

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
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Applications</h2>
        </div>
        <Link className="button-link" href="/applications/new">
          New Application
        </Link>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {items.length === 0 ? (
        <p className="muted">No applications yet. Create one to start building your pipeline.</p>
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
                    <Link href={`/applications/${item.id}`}>{item.company_name}</Link>
                  </td>
                  <td>{item.job_title}</td>
                  <td>
                    <span className={`status-pill status-${item.status}`}>{item.status}</span>
                  </td>
                  <td>{item.applied_date || 'Not yet'}</td>
                  <td>{item.location || 'Remote / n/a'}</td>
                  <td>{item.cv_used ? 'Saved' : 'Missing'}</td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button danger-button"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      {deletingId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
