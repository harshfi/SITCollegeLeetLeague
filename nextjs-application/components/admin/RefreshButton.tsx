'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshJob } from '@/lib/types';

export function RefreshButton({ classId }: { classId?: string }) {
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState<RefreshJob | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function poll(jobId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/refresh/status/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        const j: RefreshJob | null = data.job;
        setJob(j);
        if (j && j.status !== 'running' && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // keep polling
      }
    }, 1500);
  }

  async function handleRefresh() {
    setStarting(true);
    setError('');
    setJob(null);

    try {
      const endpoint = classId ? `/api/refresh/${classId}` : '/api/refresh';
      const response = await fetch(endpoint, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Refresh failed');
      poll(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setStarting(false);
    }
  }

  const running = job?.status === 'running';
  const pct =
    job && job.totalStudents > 0
      ? Math.round((job.processed / job.totalStudents) * 100)
      : 0;

  return (
    <div className="space-y-2">
      <Button onClick={handleRefresh} disabled={starting || running}>
        {starting || running ? 'Refreshing…' : '🔄 Refresh LeetCode Data'}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {job && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {job.processed}/{job.totalStudents} processed
            {job.errors > 0 && ` · ${job.errors} errors`}
            {job.status === 'complete' && ' · ✓ done'}
            {job.status === 'partial' && ' · finished with errors'}
          </p>
        </div>
      )}
    </div>
  );
}
