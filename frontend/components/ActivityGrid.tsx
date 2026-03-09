'use client';

import { ApplicationActivityPoint } from '@/types';

type Props = {
  items: ApplicationActivityPoint[];
};

function tone(count: number): string {
  if (count === 0) return 'empty';
  if (count === 1) return 'low';
  if (count === 2) return 'mid';
  return 'high';
}

export default function ActivityGrid({ items }: Props) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Momentum</p>
          <h2>Application Activity</h2>
        </div>
        <p className="muted">Last {items.length} days</p>
      </div>
      <div className="activity-grid">
        {items.map((item) => (
          <div
            key={item.day}
            className={`activity-cell ${tone(item.count)}`}
            title={`${item.day}: ${item.count} application${item.count === 1 ? '' : 's'}`}
          />
        ))}
      </div>
      <p className="muted">Each square represents one day. Darker squares mean more applications.</p>
    </section>
  );
}
