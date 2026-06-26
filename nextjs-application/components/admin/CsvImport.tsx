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
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setCsv('');
    setResult(null);
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
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, defaultClassId: defaultClassId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data as BulkResult);
      onImported();
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
              Columns: <code>name, username, rollNumber, class</code>. A header
              row is optional. <code>rollNumber</code> and <code>class</code> are
              optional — rows without a <code>class</code> use the default below.
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

            {result && (
              <div className="rounded-lg border border-border p-3 text-sm space-y-2">
                <p className="font-medium text-green-600">
                  ✓ Imported {result.created} student
                  {result.created !== 1 ? 's' : ''}
                </p>
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
