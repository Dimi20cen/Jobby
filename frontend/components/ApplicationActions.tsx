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
  return (
    <div className="action-stack">
      <div className="action-row">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isNew ? 'Create Application' : isDirty ? 'Save Changes' : 'Save Again'}
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
            ? 'Create the record first so Jobby has a place to store AI outputs.'
            : canGenerate
              ? 'Save details, then generate tailored materials when the record is ready.'
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
