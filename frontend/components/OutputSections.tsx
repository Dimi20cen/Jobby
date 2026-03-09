'use client';

import { GenerateResponse } from '@/types';

type Props = {
  data: GenerateResponse | null;
};

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export default function OutputSections({ data }: Props) {
  if (!data) {
    return (
      <section className="panel">
        <h3>Output</h3>
        <p>Your tailored bullets and draft cover letter will appear here.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h3>Tailored CV Bullets</h3>
      <ul>
        {data.tailored_bullets.map((bullet, idx) => (
          <li key={`${idx}-${bullet}`}>{bullet}</li>
        ))}
      </ul>
      <button onClick={() => copyText(data.tailored_bullets.map((b) => `- ${b}`).join('\n'))}>Copy Bullets</button>

      <h3>Draft Cover Letter</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{data.cover_letter}</p>
      <button onClick={() => copyText(data.cover_letter)}>Copy Cover Letter</button>
    </section>
  );
}
