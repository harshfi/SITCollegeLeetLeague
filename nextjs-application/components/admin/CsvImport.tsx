'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Class } from '@/lib/types';

interface BulkResult {
  created: number;
  createdClasses: string[];
  failed: { line: number; value: string; error: string }[];
}

export function CsvImport({
  classes,
  onImported,
}: {
  classes: Class[];
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [defaultClassId, setDefaultClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number; currentName: string } | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setCsv('');
    setResult(null);
    setProgress(null);
    setError('');
    setDefaultClassId('');
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsv(await file.text());
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    setResult(null);
    setProgress(null);
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, defaultClassId: defaultClassId || undefined }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Stream not supported');
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          
          if (msg.type === 'progress') {
            setProgress({ processed: msg.processed, total: msg.total, currentName: msg.currentName });
          } else if (msg.type === 'complete') {
            setResult(msg.result);
            onImported();
          } else if (msg.type === 'error') {
            throw new Error(msg.error);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import CSV
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-lg ring-1 ring-foreground/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Import students from CSV</h2>
              <button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Columns (any order, header optional):{' '}
              <code>name, username, rollNumber, class</code>.{' '}
              <code>name</code> and <code>username</code> are required — rows
              missing either are skipped. A <code>class</code> that doesn&apos;t
              exist yet is created automatically; rows without a class column use
              the default below. The username may be a handle or a full profile
              URL (e.g. <code>leetcode.com/u/jdoe</code>) — it&apos;s cleaned
              automatically.
            </p>

            <div className="space-y-2">
              <Label>Default class (for rows without a class column)</Label>
              <Select value={defaultClassId} onValueChange={(v) => setDefaultClassId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Upload a .csv file</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>…or paste CSV</Label>
              <textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={6}
                placeholder={'name,username,rollNumber\nJohn Doe,john_doe,2023001'}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            
            {progress && !result && (
              <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span>Importing students...</span>
                  <span className="font-mono">{progress.processed} / {progress.total}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300" 
                    style={{ width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` }} 
                  />
                </div>
                {progress.currentName && (
                  <p className="text-xs text-muted-foreground truncate">
                    Currently importing: {progress.currentName}
                  </p>
                )}
              </div>
            )}

            {result && (
              <div className="rounded-lg border border-border p-3 text-sm space-y-2">
                <p className="font-medium text-green-600">
                  ✓ Imported {result.created} student
                  {result.created !== 1 ? 's' : ''}
                </p>
                {result.createdClasses.length > 0 && (
                  <p className="text-muted-foreground">
                    Created {result.createdClasses.length} new class
                    {result.createdClasses.length !== 1 ? 'es' : ''}:{' '}
                    {result.createdClasses.join(', ')}
                  </p>
                )}
                {result.failed.length > 0 && (
                  <div>
                    <p className="text-destructive font-medium">
                      {result.failed.length} failed:
                    </p>
                    <ul className="mt-1 max-h-32 overflow-y-auto text-muted-foreground space-y-0.5">
                      {result.failed.map((f, i) => (
                        <li key={i}>
                          Line {f.line}: {f.value} — {f.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Close
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !csv.trim()}>
                {submitting ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
