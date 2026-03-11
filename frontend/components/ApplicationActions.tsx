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
  const generateDisabled = generating || !canGenerate;

  return (
    <div className="action-stack">
      <div className="action-row">
        <Button type="submit" disabled={saving}>
          {primaryLabel}
        </Button>
        {!isNew ? (
          <Button type="button" variant="secondary" disabled={generateDisabled} onClick={onGenerate}>
            {generating ? 'Generating...' : 'Generate AI Assets'}
          </Button>
        ) : null}
      </div>
      {!isNew && !canGenerate ? <p className="muted action-note">Save your changes and add a job description before generating.</p> : null}
      {!isNew ? (
        <div className="action-footer">
          <Button type="button" variant="danger" className="action-delete" disabled={saving} onClick={onDelete}>
            Delete Application
          </Button>
        </div>
      ) : null}
    </div>
  );
}
