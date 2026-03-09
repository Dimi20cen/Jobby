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
      <p>
        <strong>Model used:</strong> {data.used_model}
      </p>
      <h3>Evaluation</h3>
      <p>
        <strong>Relevance score:</strong> {data.relevance_score}/100
      </p>
      <p>
        <strong>JD coverage:</strong> {data.jd_coverage.join(', ') || 'N/A'}
      </p>
      <p>
        <strong>Risk flags:</strong> {data.risk_flags.join(', ') || 'None'}
      </p>

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

      <h3>Interview Questions</h3>
      <ol>
        {data.interview_questions.map((q, idx) => (
          <li key={`${idx}-${q}`}>{q}</li>
        ))}
      </ol>
      <button onClick={() => copyText(data.interview_questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n'))}>
        Copy Interview Questions
      </button>
    </section>
  );
}
