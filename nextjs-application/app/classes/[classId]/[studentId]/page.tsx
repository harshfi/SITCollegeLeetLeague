import Link from 'next/link';
import * as classService from '@/lib/services/classService';
import * as studentService from '@/lib/services/studentService';
import * as statsService from '@/lib/services/statsService';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatLastFetched, getPercentage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface StudentProfilePageProps {
  params: Promise<{ classId: string; studentId: string }>;
}

export default async function StudentProfilePage({
  params,
}: StudentProfilePageProps) {
  const { classId, studentId } = await params;

  const classData = await classService.getClassById(classId);
  const student = await studentService.getStudentById(studentId);

  if (!classData || !student) {
    return (
      <div className="text-center text-muted-foreground">
        <p>Student or class not found</p>
      </div>
    );
  }

  const stats = await statsService.getStats(student.leetcodeUsername);

  const statsGrid = [
    { label: 'Total Solved', value: stats?.totalSolved || 0 },
    { label: 'Easy', value: stats?.easySolved || 0, subValue: stats?.totalEasy || 0 },
    { label: 'Medium', value: stats?.mediumSolved || 0, subValue: stats?.totalMedium || 0 },
    { label: 'Hard', value: stats?.hardSolved || 0, subValue: stats?.totalHard || 0 },
    { label: 'Current Streak', value: stats?.streak || 0 },
    { label: 'Active Days', value: stats?.activeDays || 0 },
    { label: 'Contests', value: stats?.contestsAttended || 0 },
    { label: 'Badges', value: stats?.badgeCount || 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/classes/${classId}`}
          className="text-sm text-muted-foreground hover:text-foreground mb-2 block"
        >
          ← Back to {classData.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{student.name}</h1>
            <p className="text-muted-foreground mt-1">
              @{student.leetcodeUsername}
            </p>
            {student.rollNumber && (
              <p className="text-muted-foreground text-sm mt-1">
                Roll: {student.rollNumber}
              </p>
            )}
          </div>
          {stats && (
            <div className="text-right space-y-2">
              <Badge variant="secondary">
                #{stats.ranking || 'Unranked'} Global
              </Badge>
              {stats.lastFetchError && (
                <div className="p-2 rounded border border-destructive/30 bg-destructive/10 text-destructive text-xs">
                  Last fetch failed
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!stats ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-8">
            <p className="text-lg">📊 No stats available yet</p>
            <p className="text-sm mt-2">Refresh the data from the admin panel to see LeetCode statistics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statsGrid.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="text-center space-y-1">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  {stat.subValue !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      / {stat.subValue}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Stats */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Detailed Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Difficulty Breakdown */}
              <div>
                <h3 className="font-semibold mb-4">Difficulty Breakdown</h3>
                <div className="space-y-4">
                  {[
                    {
                      name: 'Easy',
                      solved: stats.easySolved,
                      total: stats.totalEasy,
                      color: 'bg-green-500',
                    },
                    {
                      name: 'Medium',
                      solved: stats.mediumSolved,
                      total: stats.totalMedium,
                      color: 'bg-yellow-500',
                    },
                    {
                      name: 'Hard',
                      solved: stats.hardSolved,
                      total: stats.totalHard,
                      color: 'bg-red-500',
                    },
                  ].map((difficulty) => {
                    const percentage = getPercentage(
                      difficulty.solved,
                      difficulty.total
                    );
                    return (
                      <div key={difficulty.name}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">
                            {difficulty.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {difficulty.solved} / {difficulty.total} (
                            {percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${difficulty.color}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Max Streak</p>
                  <p className="text-lg font-semibold">{stats.maxStreak || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contest Rating</p>
                  <p className="text-lg font-semibold">
                    {stats.contestRating || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Solved Today</p>
                  <p className="text-lg font-semibold">{stats.solvedToday}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Global Contest Rank
                  </p>
                  <p className="text-lg font-semibold">
                    {stats.globalContestRanking || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meta Info */}
          <Card>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>Last updated: {formatLastFetched(stats.lastFetchedAt)}</p>
              <p>Status: {stats.fetchStatus}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
