'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LeaderboardData, LeaderboardRow, TimeWindow } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Avatar } from './Avatar';
import { Podium } from './Podium';
import { InstituteVs } from './InstituteVs';
import { StudentModal } from './StudentModal';
import { AdminLockButton } from './AdminLockButton';
import { istDateKey } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { motion, AnimatePresence } from 'framer-motion';

const TABS: { key: TimeWindow; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'date', label: 'Date' },
];

type SortKey =
  | 'name'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'total'
  | 'streak'
  | 'rating'
  | 'ranking';

function StatCard({
  icon,
  label,
  children,
  delay = 0,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay 
      }}
      whileHover={{ scale: 1.05, translateY: -4 }}
      whileTap={{ scale: 0.95 }}
      className="rounded-xl bg-card/80 backdrop-blur-sm px-5 py-4 ring-1 ring-foreground/10 shadow-sm transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:ring-primary/50 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{children}</div>
    </motion.div>
  );
}

export function Dashboard({ initial }: { initial: LeaderboardData }) {
  const [windowSel, setWindowSel] = useState<TimeWindow>(initial.window);
  const [dateSel, setDateSel] = useState<string>(initial.date || istDateKey());
  const [data, setData] = useState<LeaderboardData>(initial);
  const [loading, setLoading] = useState(false);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LeaderboardRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  // Skip the first fetch: the server already rendered with `initial` for this
  // window, so refetching it on mount just doubles the DB read.
  const firstRun = useRef(true);

  useEffect(() => {
    const initialKey = `${initial.window}|${initial.date || ''}`;
    const currentKey = `${windowSel}|${windowSel === 'date' ? dateSel : ''}`;
    if (firstRun.current) {
      firstRun.current = false;
      if (currentKey === initialKey) return;
    }

    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ window: windowSel });
        if (windowSel === 'date') qs.set('date', dateSel);
        const res = await fetch(`/api/leaderboard?${qs.toString()}`, {
          signal: controller.signal,
        });
        if (res.ok) setData(await res.json());
      } catch {
        // ignore aborts / transient errors
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [windowSel, dateSel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (classFilter !== 'all' && r.classId !== classFilter) return false;
      if (q && !`${r.name} ${r.leetcodeUsername}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [data.rows, classFilter, search]);

  // Easy/Med/Hard are per-difficulty all-time numbers — only meaningful in the
  // All-Time tab. Windowed tabs show window totals only.
  const showBreakdown = data.window === 'all';

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const key =
      !showBreakdown && ['easy', 'medium', 'hard'].includes(sortKey)
        ? 'total'
        : sortKey;
    return [...filtered].sort((a, b) => {
      if (key === 'name') return a.name.localeCompare(b.name) * dir;
      return ((a[key] as number) - (b[key] as number)) * dir;
    });
  }, [filtered, sortKey, sortDir, showBreakdown]);

  const timestamp = useMemo(() => {
    try {
      return new Date(data.generatedAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  }, [data.generatedAt]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <motion.img 
              initial={{ rotate: -180, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, duration: 1 }}
              src="/logo.png" 
              alt="SIT Logo" 
              className="h-10 w-auto object-contain drop-shadow-md" 
            />
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="flex flex-col"
            >
              <h1 className="text-xl font-extrabold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-purple-600 animate-gradient-x">
                SIT LeetCode Tracker
              </h1>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Sharad Institute of Technology</span>
            </motion.div>
            <span className="ml-2 flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {timestamp} IST
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <ThemeToggle />
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setWindowSel(t.key)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  windowSel === t.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
            {windowSel === 'date' && (
              <input
                type="date"
                value={dateSel}
                max={istDateKey()}
                onChange={(e) => setDateSel(e.target.value)}
                className="ml-1 rounded-lg border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring"
              />
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 relative">
        {/* Decorative background blur */}
        <div className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="👥" label="Total Students" delay={0.1}>
            {data.totalStudents}
          </StatCard>
          <StatCard icon="</>" label="Problems Solved" delay={0.2}>
            {(data.problemsSolved || 0).toLocaleString()}
          </StatCard>
          <StatCard icon="📈" label="Today's Solves" delay={0.3}>
            {(data.todaysSolves || 0).toLocaleString()}
          </StatCard>
          <StatCard icon="🔥" label="Most Active" delay={0.4}>
            {data.mostActive ? (
              <span className="text-lg">
                {data.mostActive.name}{' '}
                <span className="text-sm font-semibold text-green-600">
                  +{data.mostActive.count}
                </span>
              </span>
            ) : (
              <span className="text-lg text-muted-foreground">—</span>
            )}
          </StatCard>
        </div>

        {/* Podium */}
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
        >
          <Podium rows={data.rows} onSelect={setSelected} showBreakdown={showBreakdown} />
        </motion.div>

        {/* Institute VS */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotateX: -15 }} 
          animate={{ opacity: 1, scale: 1, rotateX: 0 }} 
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.4 }}
        >
          <InstituteVs institutes={data.institutes} />
        </motion.div>

        {/* Leaderboard */}
        <motion.div 
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.5 }}
          className="rounded-xl bg-card/90 backdrop-blur shadow-sm ring-1 ring-foreground/10 overflow-hidden"
        >
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1">
              <FilterTab
                label="All"
                active={classFilter === 'all'}
                onClick={() => setClassFilter('all')}
              />
              {data.institutes.map((inst) => (
                <FilterTab
                  key={inst.classId}
                  label={inst.name}
                  active={classFilter === inst.classId}
                  onClick={() => setClassFilter(inst.classId)}
                />
              ))}
            </div>
            <div className="sm:w-64">
              <Input
                placeholder="Search students…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <SortHeader label="Student" sortKey="name" align="left" active={sortKey} dir={sortDir} onSort={handleSort} />
                  {showBreakdown && (
                    <>
                      <SortHeader label="Easy" sortKey="easy" align="center" active={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHeader label="Med" sortKey="medium" align="center" active={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHeader label="Hard" sortKey="hard" align="center" active={sortKey} dir={sortDir} onSort={handleSort} />
                    </>
                  )}
                  <SortHeader label="Total" sortKey="total" align="center" active={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Streak" sortKey="streak" align="center" active={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Rating" sortKey="rating" align="center" active={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="LC Rank" sortKey="ranking" align="right" active={sortKey} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <AnimatePresence mode="popLayout">
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showBreakdown ? 9 : 6}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {loading ? 'Loading…' : 'No students match.'}
                    </td>
                  </tr>
                ) : (
                  sorted.map((row, idx) => (
                    <motion.tr
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 24,
                        delay: Math.min(idx * 0.05, 0.4) 
                      }}
                      whileHover={{ scale: 1.01, backgroundColor: "var(--muted)" }}
                      key={row.studentId}
                      onClick={() => setSelected(row)}
                      className="cursor-pointer transition-colors hover:bg-muted/60"
                    >
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={row.userAvatar}
                            name={row.name}
                            className="h-8 w-8 text-xs"
                          />
                          <div>
                            <div className="font-medium leading-tight">
                              {row.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {row.className}
                            </div>
                          </div>
                        </div>
                      </td>
                      {showBreakdown && (
                        <>
                          <td className="px-4 py-3 text-center text-green-600 tabular-nums">
                            {row.easy}
                          </td>
                          <td className="px-4 py-3 text-center text-amber-600 tabular-nums">
                            {row.medium}
                          </td>
                          <td className="px-4 py-3 text-center text-red-600 tabular-nums">
                            {row.hard}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-center font-semibold tabular-nums">
                        {row.total}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {row.streak > 0 ? `${row.streak}🔥` : '0'}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {row.rating || 0}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                        {(row.ranking || 0).toLocaleString()}
                      </td>
                    </motion.tr>
                  ))
                )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      {selected && (
        <StudentModal row={selected} onClose={() => setSelected(null)} />
      )}
      <AdminLockButton />
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  align,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  align: 'left' | 'center' | 'right';
  active: SortKey;
  dir: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
}) {
  const isActive = active === sortKey;
  const justify =
    align === 'left'
      ? 'justify-start'
      : align === 'right'
        ? 'justify-end'
        : 'justify-center';
  return (
    <th
      className={cn(
        'px-4 py-3 font-medium',
        align === 'left'
          ? 'text-left'
          : align === 'right'
            ? 'text-right'
            : 'text-center'
      )}
    >
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground',
          justify,
          isActive && 'text-foreground'
        )}
      >
        {label}
        <span className="text-[10px]">
          {isActive ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-sm font-medium uppercase tracking-wide transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}
