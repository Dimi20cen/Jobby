'use client';

import { useMemo, useState } from 'react';

import { deleteApplication } from '@/lib/api';
import { ApplicationStatus, ApplicationSummary } from '@/types';
import { Button, LinkButton } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';

type Props = {
  items: ApplicationSummary[];
  statusFilter: '' | ApplicationStatus;
  onStatusFilterChange: (value: '' | ApplicationStatus) => void;
  onDeleted: (id: string) => void;
};

const statusFilters: Array<{ label: string; value: '' | ApplicationStatus }> = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Applied', value: 'applied' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' }
];

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

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20h4.75L19 9.75 14.25 5 4 15.25V20Zm3.5-1.5H5.5v-2l8.75-8.75 2 2L7.5 18.5ZM20.7 8.05a1 1 0 0 0 0-1.4l-3.35-3.35a1 1 0 0 0-1.4 0L14.9 4.35l4.75 4.75 1.05-1.05Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 8h10l-1 11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L7 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StatusFilterControl({
  statusFilter,
  onStatusFilterChange
}: Pick<Props, 'statusFilter' | 'onStatusFilterChange'>) {
  return (
    <label className="status-select-wrap">
      <span className="sr-only">Filter applications by status</span>
      <select
        className="status-select"
        aria-label="Filter applications by status"
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value as '' | ApplicationStatus)}
      >
        {statusFilters.map((filter) => (
          <option key={filter.label} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ApplicationTable({ items, statusFilter, onStatusFilterChange, onDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
      }),
    [items]
  );

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
      {error ? <p className="error">{error}</p> : null}
      {latestItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-toolbar">
            <p>{statusFilter ? 'No matching applications.' : 'No applications yet.'}</p>
            <StatusFilterControl
              statusFilter={statusFilter}
              onStatusFilterChange={onStatusFilterChange}
            />
          </div>
          <p className="muted">
            {statusFilter
              ? 'Try a different status filter to see the rest of your applications.'
              : 'Create one manually or use the extension to capture a job page into Jobby.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap table-wrap-scrollable">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Company</th>
                <th className="col-role">Role</th>
                <th className="col-location">Location</th>
                <th className="col-status status-header-cell">
                  <StatusFilterControl
                    statusFilter={statusFilter}
                    onStatusFilterChange={onStatusFilterChange}
                  />
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {latestItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-primary">
                      <LinkButton href={`/applications/${item.id}`} className="table-link" variant="secondary">
                        {item.company_name}
                      </LinkButton>
                      <span className="table-meta">Updated {formatDate(item.updated_at)}</span>
                    </div>
                  </td>
                  <td className="col-role">{item.job_title}</td>
                  <td className="col-location">{item.location || 'N/A'}</td>
                  <td className="col-status">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="table-actions-cell">
                    <div className="table-actions">
                      <LinkButton href={`/applications/${item.id}`} className="icon-button" variant="secondary">
                        <PencilIcon />
                        <span className="sr-only">Edit {item.company_name}</span>
                      </LinkButton>
                      <Button
                        type="button"
                        variant="danger"
                        className="icon-button"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                      >
                        <TrashIcon />
                        <span className="sr-only">
                          {deletingId === item.id ? `Deleting ${item.company_name}` : `Delete ${item.company_name}`}
                        </span>
                      </Button>
                    </div>
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
