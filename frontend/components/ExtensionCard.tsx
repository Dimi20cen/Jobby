import Card from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';

export default function ExtensionCard() {
  return (
    <Card className="extension-card quiet-panel">
      <h2>Chrome extension</h2>
      <p className="muted">Capture a job posting and save it into Jobby.</p>
      <LinkButton href="https://github.com/Dimi20cen/Jobby/tree/main/extension" variant="secondary">
        Open Extension Files
      </LinkButton>
    </Card>
  );
}
