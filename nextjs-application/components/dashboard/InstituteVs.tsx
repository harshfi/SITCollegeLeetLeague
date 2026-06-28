'use client';

import { useState, useEffect } from 'react';
import { InstituteSummary } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function VsBar({
  label,
  a,
  b,
}: {
  label: string;
  a: number;
  b: number;
}) {
  const total = a + b;
  const leftPct = total > 0 ? (a / total) * 100 : 50;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium tabular-nums">{a.toLocaleString()}</span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="font-medium tabular-nums">{b.toLocaleString()}</span>
      </div>
      <div className="relative flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="bg-blue-600" style={{ width: `${leftPct}%` }} />
        <div className="flex-1 bg-violet-500" />
      </div>
    </div>
  );
}

export function InstituteVs({ institutes }: { institutes: InstituteSummary[] }) {
  const sorted = [...institutes].sort((x, y) => y.memberCount - x.memberCount);
  
  // Initialize directly with the top 2 classes so they are selected by default on load
  const [selectedAId, setSelectedAId] = useState<string | null>(sorted[0]?.id || null);
  const [selectedBId, setSelectedBId] = useState<string | null>(sorted[1]?.id || null);

  if (sorted.length < 2) return null;

  const aId = selectedAId || sorted[0].id;
  const bId = selectedBId || sorted[1].id;

  const a = sorted.find((i) => i.id === aId) || sorted[0];
  const b = sorted.find((i) => i.id === bId) || sorted[1];

  const diff = Math.abs(a.allTime - b.allTime);
  const leader = a.allTime >= b.allTime ? a : b;

  return (
    <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="mb-5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
          <Select 
            value={a.id} 
            onValueChange={(val) => {
              if (val === b.id) {
                setSelectedBId(a.id); // Swap if selecting the same class
              }
              setSelectedAId(val);
            }}
          >
            <SelectTrigger className="w-auto min-w-[140px] h-8 bg-transparent font-semibold p-2 shadow-sm rounded-md">
              <SelectValue placeholder={a.name} />
            </SelectTrigger>
            <SelectContent>
              {sorted.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground whitespace-nowrap text-xs">{a.memberCount} members</span>
        </div>
        
        <span className="text-amber-500 font-semibold shrink-0">⚡ VS</span>
        
        <div className="flex items-center gap-2 w-full md:w-auto md:justify-end">
          <span className="text-muted-foreground whitespace-nowrap text-xs text-right flex-1 md:flex-none">{b.memberCount} members</span>
          <Select 
            value={b.id} 
            onValueChange={(val) => {
              if (val === a.id) {
                setSelectedAId(b.id); // Swap if selecting the same class
              }
              setSelectedBId(val);
            }}
          >
            <SelectTrigger className="w-auto min-w-[140px] h-8 bg-transparent font-semibold p-2 shadow-sm rounded-md text-right [&>span]:w-full [&>span]:text-right flex-row-reverse">
              <SelectValue placeholder={b.name} />
            </SelectTrigger>
            <SelectContent>
              {sorted.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shrink-0" />
        </div>
      </div>

      <div className="space-y-4">
        <VsBar label="All Time" a={a.allTime} b={b.allTime} />
        <VsBar label="Today" a={a.today} b={b.today} />
        <VsBar label="This Week" a={a.week} b={b.week} />
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{leader.name}</span>{' '}
        leads by{' '}
        <span className="font-semibold text-foreground">
          {diff.toLocaleString()}
        </span>{' '}
        problems
      </p>
    </div>
  );
}
