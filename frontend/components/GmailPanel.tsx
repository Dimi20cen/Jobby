'use client';

import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ApplicationEmailLinks } from '@/types';

type Props = {
  isNew: boolean;
  data: ApplicationEmailLinks | null;
  loading: boolean;
  syncing: boolean;
  mutatingThreadId: string | null;
  onConnect: () => void;
  onSync: () => void;
  onLink: (threadId: string) => void;
  onReject: (threadId: string) => void;
  onUnlink: (threadId: string) => void;
};

function formatDate(value: string | null): string {
  if (!value) {
    return 'Unknown date';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function ThreadCard({
  thread,
  actionLabel,
  secondaryLabel,
  busy,
  onPrimary,
  onSecondary
}: {
  thread: ApplicationEmailLinks['suggested'][number];
  actionLabel: string;
  secondaryLabel?: string;
  busy: boolean;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  return (
    <article className="gmail-thread-card">
      <div className="gmail-thread-copy">
        <div className="gmail-thread-header">
          <h3>{thread.subject || 'Untitled thread'}</h3>
          <span className="gmail-thread-score">{thread.match_score}% match</span>
        </div>
        <p className="muted">{thread.participants_summary || 'No participant summary available'}</p>
        <p>{thread.snippet || 'No message preview available yet.'}</p>
        <p className="muted">
          {thread.message_count} messages · {formatDate(thread.last_message_at)}
        </p>
        {thread.match_reasons.length ? (
          <div className="gmail-thread-reasons">
            {thread.match_reasons.map((reason) => (
              <span key={reason} className="gmail-reason-chip">
                {reason}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="gmail-thread-actions">
        <a href={thread.gmail_url} className="button-link secondary-link" target="_blank" rel="noreferrer">
          Open Gmail
        </a>
        <Button onClick={onPrimary} disabled={busy}>
          {actionLabel}
        </Button>
        {secondaryLabel && onSecondary ? (
          <Button variant="secondary" onClick={onSecondary} disabled={busy}>
            {secondaryLabel}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export default function GmailPanel({
  isNew,
  data,
  loading,
  syncing,
  mutatingThreadId,
  onConnect,
  onSync,
  onLink,
  onReject,
  onUnlink
}: Props) {
  if (isNew) {
    return (
      <Card className="gmail-panel">
        <div className="section-heading">
          <h2>Gmail threads</h2>
        </div>
        <p className="muted">Gmail linking appears after the application is created.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="gmail-panel">
        <div className="section-heading">
          <h2>Gmail threads</h2>
        </div>
        <p className="muted">Loading Gmail state...</p>
      </Card>
    );
  }

  const connection = data?.connection;
  return (
    <Card className="gmail-panel">
      <div className="section-heading gmail-panel-heading">
        <div>
          <h2>Gmail threads</h2>
          <p className="muted">
            {connection?.connected
              ? `Connected as ${connection.email_address}`
              : 'Connect Gmail to pull related recruiter threads into this application.'}
          </p>
        </div>
        <div className="gmail-panel-actions">
          {!connection?.connected ? (
            <Button onClick={onConnect}>Connect Gmail</Button>
          ) : (
            <Button variant="secondary" onClick={onSync} disabled={syncing}>
              {syncing ? 'Refreshing...' : 'Refresh Threads'}
            </Button>
          )}
        </div>
      </div>

      {connection?.connected ? (
        <>
          <div className="gmail-section">
            <h3>Suggested threads</h3>
            {data?.suggested.length ? (
              <div className="gmail-thread-list">
                {data.suggested.map((thread) => (
                  <ThreadCard
                    key={thread.thread_id}
                    thread={thread}
                    actionLabel="Link Thread"
                    secondaryLabel="Reject"
                    busy={mutatingThreadId === thread.thread_id}
                    onPrimary={() => onLink(thread.thread_id)}
                    onSecondary={() => onReject(thread.thread_id)}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">No suggested threads yet. Refresh after Gmail has relevant messages.</p>
            )}
          </div>

          <div className="gmail-section">
            <h3>Linked threads</h3>
            {data?.linked.length ? (
              <div className="gmail-thread-list">
                {data.linked.map((thread) => (
                  <ThreadCard
                    key={thread.thread_id}
                    thread={thread}
                    actionLabel="Unlink"
                    busy={mutatingThreadId === thread.thread_id}
                    onPrimary={() => onUnlink(thread.thread_id)}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">No linked threads yet.</p>
            )}
          </div>
        </>
      ) : null}
    </Card>
  );
}
