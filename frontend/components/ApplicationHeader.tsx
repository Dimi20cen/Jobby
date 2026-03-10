import { LinkButton } from '@/components/ui/Button';
import { ApplicationStatus } from '@/types';

type Props = {
  title: string;
  subtitle: string;
  status: ApplicationStatus;
  hasAiOutputs: boolean;
  isDirty: boolean;
};

export default function ApplicationHeader({ title, subtitle, status, hasAiOutputs, isDirty }: Props) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        <div className="header-meta">
          <span className={`status-pill status-${status}`}>{status}</span>
          <span className="header-chip">{hasAiOutputs ? 'AI generated' : 'No AI yet'}</span>
          <span className="header-chip">{isDirty ? 'Unsaved changes' : 'Saved state'}</span>
        </div>
      </div>
      <LinkButton href="/" variant="secondary">
        Back to Dashboard
      </LinkButton>
    </div>
  );
}
