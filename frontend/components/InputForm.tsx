'use client';

import { FormEvent, useState } from 'react';

type Props = {
  loading: boolean;
  onSubmit: (jd: string, cv: string) => Promise<void>;
};

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
