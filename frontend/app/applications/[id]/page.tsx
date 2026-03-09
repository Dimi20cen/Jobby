import ApplicationEditor from '@/components/ApplicationEditor';

export default function ApplicationDetailPage({
  params
}: {
  params: { id: string };
}) {
  return <ApplicationEditor applicationId={params.id} />;
}
