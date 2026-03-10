import { Button } from '@/components/ui/Button';

type Props = {
  isNew: boolean;
  saving: boolean;
  generating: boolean;
  onGenerate: () => void;
  onDelete: () => void;
};

export default function ApplicationActions({
  isNew,
  saving,
  generating,
  onGenerate,
  onDelete
}: Props) {
  return (
    <div className="action-row">
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : isNew ? 'Create Application' : 'Save Changes'}
      </Button>
      {!isNew ? (
        <Button type="button" variant="secondary" disabled={generating} onClick={onGenerate}>
          {generating ? 'Generating...' : 'Generate AI Assets'}
        </Button>
      ) : null}
      {!isNew ? (
        <Button type="button" variant="danger" disabled={saving} onClick={onDelete}>
          Delete Application
        </Button>
      ) : null}
    </div>
  );
}
