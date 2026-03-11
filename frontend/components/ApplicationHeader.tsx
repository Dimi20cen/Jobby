import { LinkButton } from '@/components/ui/Button';

type Props = {
  title: string;
  eyebrow?: string;
  description?: string;
  meta?: string[];
};

export default function ApplicationHeader({ title, eyebrow, description, meta = [] }: Props) {
  return (
    <div className="page-header application-page-header">
      <div className="page-header-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {meta.length > 0 ? (
          <div className="page-header-meta">
            {meta.map((item) => (
              <span key={item} className="meta-pill">
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="page-header-actions">
        <LinkButton href="/" variant="secondary">
          Back to Dashboard
        </LinkButton>
      </div>
    </div>
  );
}
