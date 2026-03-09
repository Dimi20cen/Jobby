'use client';

import { HistoryItem } from '@/types';

type Props = {
  items: HistoryItem[];
};

export default function HistoryList({ items }: Props) {
  return (
    <section className="panel">
      <h3>Recent Generations</h3>
      {items.length === 0 ? <p>No history yet.</p> : null}
      {items.map((item) => (
        <article key={item.id} style={{ borderTop: '1px solid #dbe2ea', paddingTop: 8, marginTop: 8 }}>
          <small>{new Date(item.created_at).toLocaleString()}</small>
          <ul>
            {item.tailored_bullets.slice(0, 3).map((bullet, idx) => (
              <li key={`${item.id}-${idx}`}>{bullet}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
