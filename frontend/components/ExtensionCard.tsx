import Card from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';

export default function ExtensionCard() {
  return (
    <Card className="extension-card">
      <p className="eyebrow">Capture Layer</p>
      <h2>Chrome Extension</h2>
      <p>
        Save jobs straight from job boards into Jobby. The local MVP now lives in the repo as an
        unpacked Chrome extension with scraping, draft creation, and save-plus-generate support.
      </p>
      <LinkButton href="https://github.com/Dimi20cen/Jobby/tree/main/extension" variant="secondary">
        Open Extension Files
      </LinkButton>
    </Card>
  );
}
