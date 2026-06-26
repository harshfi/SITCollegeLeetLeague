'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Student, Class } from '@/lib/types';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    classId: '',
    leetcodeUsername: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterClassId, setFilterClassId] = useState('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/students').then((r) => r.json()),
      fetch('/api/classes').then((r) => r.json()),
    ])
      .then(([studentsData, classesData]) => {
        setStudents(studentsData);
        setClasses(classesData);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load data');
        setLoading(false);
      });
  }, []);

  async function handleCreateStudent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create student');
      }

      const newStudent = await res.json();
      setStudents([...students, newStudent]);
      setFormData({
        name: '',
        rollNumber: '',
        classId: '',
        leetcodeUsername: '',
      });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStudent(studentId: string) {
    if (!confirm('Delete this student?')) return;

    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete student');

      setStudents(students.filter((s) => s.id !== studentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  const filteredStudents =
    filterClassId !== 'all'
      ? students.filter((s) => s.classId === filterClassId)
      : students;

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Manage Students</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Student'}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-name">Student Name</Label>
                <Input
                  id="student-name"
                  placeholder="e.g., John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-roll">Roll Number (optional)</Label>
                <Input
                  id="student-roll"
                  placeholder="e.g., 2023001"
                  value={formData.rollNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, rollNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, classId: value ?? '' })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-username">LeetCode Username</Label>
                <Input
                  id="student-username"
                  placeholder="e.g., john_doe_123"
                  value={formData.leetcodeUsername}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      leetcodeUsername: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={
                  saving ||
                  !formData.name ||
                  !formData.classId ||
                  !formData.leetcodeUsername
                }
              >
                {saving ? 'Creating...' : 'Create Student'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {classes.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground">
            No classes yet. Please create a class first.
          </CardContent>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground">
            No students yet. Add one to get started!
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2 max-w-xs">
            <Label>Filter by Class</Label>
            <Select
              value={filterClassId}
              onValueChange={(value) => setFilterClassId(value ?? 'all')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>LeetCode Username</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const studentClass = classes.find(
                      (c) => c.id === student.classId
                    );
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        <TableCell>{studentClass?.name || 'Unknown'}</TableCell>
                        <TableCell>{student.leetcodeUsername}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteStudent(student.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
