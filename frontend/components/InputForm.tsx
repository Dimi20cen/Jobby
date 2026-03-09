'use client';

import { FormEvent, useState } from 'react';

type Props = {
  loading: boolean;
  onSubmit: (jd: string, cv: string) => Promise<void>;
};

const DEMO_JD = `We are hiring a Product Analyst to partner with product managers and engineers.
Responsibilities include defining metrics, building dashboards, designing experiments, and presenting insights.
Requirements: SQL, stakeholder communication, data storytelling, and ownership mindset.`;

const DEMO_CV = `Data Analyst with 3 years of experience in SaaS. Built KPI dashboards in SQL and BI tools,
automated weekly reporting, and partnered with product and engineering on A/B testing decisions.
Improved conversion by 9% through funnel analysis and recommendation rollouts.`;

export default function InputForm({ loading, onSubmit }: Props) {
  const [jobDescription, setJobDescription] = useState('');
  const [cvText, setCvText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (jobDescription.trim().length < 30 || cvText.trim().length < 30) {
      setError('Both fields must be at least 30 characters long.');
      return;
    }
    setError(null);
    await onSubmit(jobDescription, cvText);
  };

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Generate Application Draft</h2>
      <p>Paste a job description and your CV text to generate tailored output.</p>
      <p>
        <button
          type="button"
          onClick={() => {
            setJobDescription(DEMO_JD);
            setCvText(DEMO_CV);
          }}
          disabled={loading}
        >
          Try Demo Data
        </button>
      </p>
      <div className="grid">
        <div>
          <label htmlFor="jd">Job Description</label>
          <textarea id="jd" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cv">CV Text</label>
          <textarea id="cv" value={cvText} onChange={(e) => setCvText(e.target.value)} />
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" disabled={loading}>{loading ? 'Generating...' : 'Generate'}</button>
    </form>
  );
}
