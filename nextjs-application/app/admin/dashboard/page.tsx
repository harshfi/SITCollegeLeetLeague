import Link from 'next/link';
import * as classService from '@/lib/services/classService';
import * as studentService from '@/lib/services/studentService';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { AdminShell } from '@/components/admin/AdminShell';
import { ChangePinModal } from '@/components/admin/ChangePinModal';

export const revalidate = 60; // Cache for 60 seconds to prevent hitting quotas

export default async function AdminDashboard() {
  const classes = await classService.getClasses();
  const students = await studentService.getStudents();

  const avgPerClass =
    classes.length > 0 ? (students.length / classes.length).toFixed(1) : '0';

  return (
    <AdminShell>
      <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{classes.length}</div>
            <p className="text-muted-foreground mt-2">Total Classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{students.length}</div>
            <p className="text-muted-foreground mt-2">Total Students</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{avgPerClass}</div>
            <p className="text-muted-foreground mt-2">Avg Students/Class</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/classes" className={buttonVariants()}>
            Manage Classes
          </Link>
          <Link href="/admin/students" className={buttonVariants()}>
            Manage Students
          </Link>
          <ChangePinModal />
          <RefreshButton />
        </div>
      </div>

      {/* Recent Classes */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Classes</h2>
        {classes.length === 0 ? (
          <Card>
            <CardContent className="text-center text-muted-foreground">
              No classes yet.{' '}
              <Link href="/admin/classes" className="text-primary underline">
                Create one
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.slice(0, 6).map((cls) => (
              <Card key={cls.id}>
                <CardContent className="flex flex-col justify-between h-full pt-6">
                  <div>
                    <h3 className="font-semibold text-lg">{cls.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      {cls.studentCount} students
                    </p>
                  </div>
                  <RefreshButton classId={cls.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </div>
    </AdminShell>
  );
}
