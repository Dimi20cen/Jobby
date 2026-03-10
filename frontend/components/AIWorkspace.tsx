import Card from '@/components/ui/Card';
import { TextareaField } from '@/components/ui/Field';
import { ApplicationDetail, CreateApplicationRequest } from '@/types';

type Props = {
  detail: ApplicationDetail | null;
  form: CreateApplicationRequest;
  onFieldChange: <K extends keyof CreateApplicationRequest>(key: K, value: CreateApplicationRequest[K]) => void;
};

export default function AIWorkspace({ detail, form, onFieldChange }: Props) {
  return (
    <Card>
      <div className="section-heading">
        <div>
          <p className="eyebrow">AI Workspace</p>
          <h2>Outputs and Evaluation</h2>
        </div>
        {detail?.used_model ? <p className="muted">Model: {detail.used_model}</p> : null}
      </div>
      <p>
        <strong>Relevance score:</strong> {detail?.relevance_score ?? 'Not generated'}
      </p>
      <p>
        <strong>JD coverage:</strong> {detail?.jd_coverage.join(', ') || 'Not generated'}
      </p>
      <p>
        <strong>Risk flags:</strong> {detail?.risk_flags.join(', ') || 'Not generated'}
      </p>
      <TextareaField
        label="Tailored Bullets"
        value={form.tailored_bullets.join('\n')}
        onChange={(value) =>
          onFieldChange(
            'tailored_bullets',
            value
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
          )
        }
      />
      <TextareaField
        label="Cover Letter"
        value={form.cover_letter}
        onChange={(value) => onFieldChange('cover_letter', value)}
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
      />
    </Card>
  );
}
