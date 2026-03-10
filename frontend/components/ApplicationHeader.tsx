import { LinkButton } from '@/components/ui/Button';

type Props = {
  title: string;
  subtitle: string;
};

export default function ApplicationHeader({ title, subtitle }: Props) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">Application Detail</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <LinkButton href="/" variant="secondary">
        Back to Dashboard
      </LinkButton>
    </div>
  );
}
