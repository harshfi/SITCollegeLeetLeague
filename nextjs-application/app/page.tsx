import Link from 'next/link';
import * as classService from '@/lib/services/classService';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const classes = await classService.getClasses();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LeetCode Tracker</h1>
        <p className="text-muted-foreground mt-1">
          Track your college&apos;s LeetCode progress
        </p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground py-12">
            No classes yet. Check back soon!
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/classes/${cls.id}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardContent className="space-y-2">
                  <h2 className="text-lg font-semibold">{cls.name}</h2>
                  {cls.description && (
                    <p className="text-sm text-muted-foreground">
                      {cls.description}
                    </p>
                  )}
                  <div className="pt-2 text-sm text-muted-foreground">
                    {cls.studentCount} student
                    {cls.studentCount !== 1 ? 's' : ''}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
