import Card from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';

export default function ExtensionCard() {
  return (
    <Card className="extension-card">
      <p className="eyebrow">Capture Layer</p>
      <h2>Chrome Extension</h2>
      <p>
        Save jobs straight from job boards into Jobby. The extension flow is planned next, and this
        dashboard card is the install handoff for that future release.
      </p>
      <LinkButton href="https://github.com" variant="secondary">
        Download Coming Soon
      </LinkButton>
    </Card>
  );
}
