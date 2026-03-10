import Card from '@/components/ui/Card';
import { TextareaField } from '@/components/ui/Field';
import { ApplicationDetail, CreateApplicationRequest } from '@/types';

type Props = {
  detail: ApplicationDetail | null;
  form: CreateApplicationRequest;
  generating: boolean;
  onFieldChange: <K extends keyof CreateApplicationRequest>(key: K, value: CreateApplicationRequest[K]) => void;
};

function joinItems(items: string[]): string {
  return items.length > 0 ? items.join(', ') : 'Not generated';
}

export default function AIWorkspace({ detail, form, generating, onFieldChange }: Props) {
  const hasOutputs = Boolean(form.cover_letter || form.interview_questions.length);

  return (
    <Card className="ai-panel">
      <div className="section-heading">
        <div>
          <h2>AI outputs</h2>
        </div>
        <p className="muted">{detail?.used_model ? `Model: ${detail.used_model}` : 'Generate when the record is ready.'}</p>
      </div>
      <div className="ai-intro compact-copy">
        {!hasOutputs && !generating ? (
          <p className="ai-empty">No AI outputs yet.</p>
        ) : null}
        {generating ? <p className="ai-empty">Generation is running. Updated materials will appear here when ready.</p> : null}
      </div>
      <div className="ai-metrics">
        <div className="ai-metric-card">
          <span className="ai-metric-label">Relevance</span>
          <strong>{detail?.relevance_score ?? 'Not generated'}</strong>
        </div>
        <div className="ai-metric-card">
          <span className="ai-metric-label">JD coverage</span>
          <strong>{joinItems(detail?.jd_coverage || [])}</strong>
        </div>
        <div className="ai-metric-card">
          <span className="ai-metric-label">Risk flags</span>
          <strong>{joinItems(detail?.risk_flags || [])}</strong>
        </div>
      </div>
      <TextareaField
        label="Cover Letter"
        value={form.cover_letter}
        onChange={(value) => onFieldChange('cover_letter', value)}
        rows={12}
      />
      <TextareaField
        label="Interview Questions"
        value={form.interview_questions.join('\n')}
        onChange={(value) =>
          onFieldChange(
            'interview_questions',
            value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
          )
        }
        rows={8}
      />
    </Card>
  );
}
