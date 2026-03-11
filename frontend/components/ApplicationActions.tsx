import { Button } from '@/components/ui/Button';

type Props = {
  isNew: boolean;
  saving: boolean;
  generating: boolean;
  canGenerate: boolean;
  isDirty: boolean;
  onGenerate: () => void;
  onDelete: () => void;
};

export default function ApplicationActions({
  isNew,
  saving,
  generating,
  canGenerate,
  isDirty,
  onGenerate,
  onDelete
}: Props) {
  const primaryLabel = saving
    ? 'Saving...'
    : isNew
      ? 'Create Application'
      : isDirty
        ? 'Save Changes'
        : 'Save Application';

  return (
    <div className="action-stack">
      <div className="readiness-card">
        <div>
          <p className="eyebrow">Next Step</p>
          <h2>{canGenerate ? 'This application is ready for AI help' : 'Finish setup before generating'}</h2>
        </div>
      </div>
      <div className="action-row">
        <Button type="submit" disabled={saving}>
          {primaryLabel}
        </Button>
        {!isNew ? (
          <Button type="button" variant="secondary" disabled={generating || !canGenerate} onClick={onGenerate}>
            {generating ? 'Generating...' : 'Generate AI Assets'}
          </Button>
        ) : null}
      </div>
      <div className="action-support">
        <p className="muted">
          {isNew
            ? 'Create the record first, then generate tailored materials from the saved application.'
            : canGenerate
              ? isDirty
                ? 'Save your latest edits before generating so the outputs reflect the current record.'
                : 'Generate tailored materials whenever you want a fresh draft.'
              : 'Add a job description before generating tailored materials.'}
        </p>
        {!isNew ? (
          <Button type="button" variant="danger" disabled={saving} onClick={onDelete}>
            Delete Application
          </Button>
        ) : null}
      </div>
    </div>
  );
}
