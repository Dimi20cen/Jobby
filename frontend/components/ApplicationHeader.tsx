import { LinkButton } from '@/components/ui/Button';

type Props = {
  title: string;
};

export default function ApplicationHeader({ title }: Props) {
  return (
    <div className="page-header application-page-header">
      <div className="page-header-copy">
        <h1>{title}</h1>
      </div>
      <div className="page-header-actions">
        <LinkButton href="/" variant="secondary">
          Back to Dashboard
        </LinkButton>
      </div>
    </div>
  );
}
