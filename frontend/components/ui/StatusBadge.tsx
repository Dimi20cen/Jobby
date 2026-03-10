import { ApplicationStatus } from '@/types';

type Props = {
  status: ApplicationStatus;
};

export default function StatusBadge({ status }: Props) {
  return <span className={`status-pill status-${status}`}>{status}</span>;
}
