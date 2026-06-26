import Link from 'next/link';
import * as classService from '@/lib/services/classService';
import * as studentService from '@/lib/services/studentService';
import * as statsService from '@/lib/services/statsService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatLastFetched } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface ClassLeaderboardPageProps {
  params: Promise<{ classId: string }>;
}

export default async function ClassLeaderboardPage({
  params,
}: ClassLeaderboardPageProps) {
  const { classId } = await params;

  const classData = await classService.getClassById(classId);
  if (!classData) {
    return (
      <div className="text-center text-muted-foreground">
        <p>Class not found</p>
      </div>
    );
  }

  const students = await studentService.getStudentsByClassId(classId);

  // Fetch stats for all students in parallel
  const statsPromises = students.map((s) =>
    statsService
      .getStats(s.leetcodeUsername)
      .then((stats) => ({
        student: s,
        stats,
      }))
      .catch(() => ({
        student: s,
        stats: null,
      }))
  );

  const studentStatsArray = await Promise.all(statsPromises);

  // Filter and sort by total solved
  const studentsWithStats = studentStatsArray
    .filter((item) => item.stats)
    .sort((a, b) => (b.stats?.totalSolved || 0) - (a.stats?.totalSolved || 0))
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground mb-2 block"
          >
            ← Back to Classes
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {classData.name}
          </h1>
        </div>
        <Badge variant="secondary">{students.length} students</Badge>
      </div>

      {studentsWithStats.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-8">
            {students.length === 0
              ? 'No students in this class yet.'
              : (
                <div>
                  <p className="text-lg">📊 No stats available yet</p>
                  <p className="text-sm mt-2">Refresh the data from the admin panel to see LeetCode statistics</p>
                </div>
              )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Easy</TableHead>
                  <TableHead className="text-center">Medium</TableHead>
                  <TableHead className="text-center">Hard</TableHead>
                  <TableHead className="text-center">Streak</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsWithStats.map(({ student, stats, rank }) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      {rank === 1 && <span>🥇</span>}
                      {rank === 2 && <span>🥈</span>}
                      {rank === 3 && <span>🥉</span>}
                      {rank > 3 && (
                        <span className="font-semibold text-muted-foreground">
                          {rank}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/classes/${classId}/${student.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {student.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {stats?.totalSolved || 0}
                    </TableCell>
                    <TableCell className="text-center text-green-600">
                      {stats?.easySolved || 0}
                    </TableCell>
                    <TableCell className="text-center text-yellow-600">
                      {stats?.mediumSolved || 0}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {stats?.hardSolved || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {stats?.streak ? (
                        <span>🔥 {stats.streak}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {stats?.lastFetchedAt
                        ? formatLastFetched(stats.lastFetchedAt)
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
