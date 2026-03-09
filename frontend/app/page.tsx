'use client';

import { useEffect, useState } from 'react';

import HistoryList from '@/components/HistoryList';
import InputForm from '@/components/InputForm';
import OutputSections from '@/components/OutputSections';
import { generate, getApplications } from '@/lib/api';
import { GenerateResponse, HistoryItem } from '@/types';

export default function HomePage() {
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const items = await getApplications(5);
      setHistory(items);
    } catch {
      // History should not block core flow.
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSubmit = async (jd: string, cv: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await generate(jd, cv);
      setResult(data);
      await loadHistory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>AI Jobber</h1>
      <p>Fast AI-assisted first drafts for job applications.</p>
      <InputForm loading={loading} onSubmit={handleSubmit} />
      {error ? <p className="error panel">{error}</p> : null}
      <OutputSections data={result} />
      <HistoryList items={history} />
    </main>
  );
}
