'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function RefreshButton({ classId }: { classId?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleRefresh() {
    setLoading(true);
    setMessage('');

    try {
      const endpoint = classId ? `/api/refresh/${classId}` : '/api/refresh';
      const response = await fetch(endpoint, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      setMessage(`✅ Refresh started! Job ID: ${data.jobId}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleRefresh}
        disabled={loading}
        variant="default"
      >
        {loading ? 'Refreshing...' : '🔄 Refresh LeetCode Data'}
      </Button>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
