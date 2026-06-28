'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Student, Class, StudentStats } from '@/lib/types';
import { AdminShell } from '@/components/admin/AdminShell';
import { CsvImport } from '@/components/admin/CsvImport';

type SortField = 'name' | 'class' | 'username' | 'status';
type SortOrder = 'asc' | 'desc';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [stats, setStats] = useState<Record<string, StudentStats>>({});
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
  const [filterErrorsOnly, setFilterErrorsOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [retrying, setRetrying] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    rollNumber: '',
    leetcodeUsername: '',
    classId: '',
  });
  const [updating, setUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterClassId, filterErrorsOnly, sortBy, sortOrder, searchQuery]);

  async function reloadData() {
    try {
      const [studentsData, classesData] = await Promise.all([
        fetch('/api/students').then((r) => r.json()),
        fetch('/api/classes').then((r) => r.json()),
      ]);
      setStudents(studentsData);
      setClasses(classesData);

      try {
        const statsRes = await fetch('/api/student-stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const newStats: Record<string, StudentStats> = {};
          studentsData.forEach((student: Student) => {
            if (statsData.data[student.leetcodeUsername]) {
              newStats[student.id] = statsData.data[student.leetcodeUsername];
            }
          });
          setStats(newStats);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Automatically fetch the student's LeetCode data
      try {
        const statsRes = await fetch(
          `/api/student-stats/${formData.leetcodeUsername}`
        );
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats({ ...stats, [newStudent.id]: statsData.data });
        }
      } catch {
        // If fetch fails, that's okay - they can retry manually
      }

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
      const newStats = { ...stats };
      delete newStats[studentId];
      setStats(newStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  async function handleRetry(studentId: string, username: string) {
    setRetrying(studentId);
    try {
      // Force refresh this student's stats
      const res = await fetch(`/api/student-stats/${username}?force=true`, {
        method: 'GET',
      });

      if (res.ok) {
        const data = await res.json();
        setStats({ ...stats, [studentId]: data.data });
      }
    } catch (err) {
      setError('Failed to retry');
    } finally {
      setRetrying(null);
    }
  }

  function startEdit(student: Student) {
    setEditingId(student.id);
    setEditFormData({
      name: student.name,
      rollNumber: student.rollNumber || '',
      leetcodeUsername: student.leetcodeUsername,
      classId: student.classId,
    });
  }

  async function handleUpdateStudent() {
    if (!editingId) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/students/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update student');
      }

      const updatedStudent = await res.json();
      setStudents(
        students.map((s) => (s.id === editingId ? updatedStudent : s))
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdating(false);
    }
  }

  const filteredStudents = students
    .filter((s) => (filterClassId !== 'all' ? s.classId === filterClassId : true))
    .filter((s) => {
      if (!searchQuery) return true;
      const lower = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(lower) ||
        s.leetcodeUsername.toLowerCase().includes(lower) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(lower))
      );
    })
    .filter((s) => {
      if (!filterErrorsOnly) return true;
      const studentStats = stats[s.id];
      return studentStats?.fetchStatus === 'error';
    });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortBy) {
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'class':
        aVal = classes.find((c) => c.id === a.classId)?.name || '';
        bVal = classes.find((c) => c.id === b.classId)?.name || '';
        break;
      case 'username':
        aVal = a.leetcodeUsername;
        bVal = b.leetcodeUsername;
        break;
      case 'status':
        aVal = stats[a.id]?.fetchStatus || 'unknown';
        bVal = stats[b.id]?.fetchStatus || 'unknown';
        break;
    }

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedStudents.length / pageSize);
  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const errorCount = Object.values(stats).filter(
    (s) => s.fetchStatus === 'error'
  ).length;

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  function SortableHeader({ field, label }: { field: SortField; label: string }) {
    return (
      <TableHead
        onClick={() => toggleSort(field)}
        className="cursor-pointer hover:bg-muted/50"
      >
        <button className="flex items-center gap-2 font-semibold">
          {label}
          {sortBy === field && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
        </button>
      </TableHead>
    );
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="text-center text-muted-foreground">Loading...</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Manage Students</h1>
          <div className="flex gap-2">
            <CsvImport classes={classes} onImported={reloadData} />
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Add Student'}
            </Button>
          </div>
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
            <div className="flex gap-4 items-end flex-wrap">
              <div className="space-y-2 flex-1 min-w-[200px] max-w-xs">
                <Label>Search Students</Label>
                <Input
                  placeholder="Search name, username, roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-w-xs min-w-[150px]">
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

              <Button
                variant={filterErrorsOnly ? 'default' : 'outline'}
                onClick={() => setFilterErrorsOnly(!filterErrorsOnly)}
              >
                {errorCount > 0 && (
                  <Badge className="mr-2" variant="destructive">
                    {errorCount}
                  </Badge>
                )}
                Show Errors Only
              </Button>
            </div>

            <Card>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="name" label="Name" />
                      <SortableHeader field="class" label="Class" />
                      <SortableHeader field="username" label="LeetCode" />
                      <SortableHeader field="status" label="Status" />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student) => {
                      const studentClass = classes.find(
                        (c) => c.id === student.classId
                      );
                      const studentStats = stats[student.id];
                      const hasError =
                        studentStats?.fetchStatus === 'error';
                      const isEditing = editingId === student.id;

                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {isEditing ? (
                              <Input
                                value={editFormData.name}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    name: e.target.value,
                                  })
                                }
                                size={20}
                              />
                            ) : (
                              student.name
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Select
                                value={editFormData.classId}
                                onValueChange={(value) =>
                                  setEditFormData({
                                    ...editFormData,
                                    classId: value ?? '',
                                  })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                      {cls.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              studentClass?.name || 'Unknown'
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={editFormData.leetcodeUsername}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    leetcodeUsername: e.target.value,
                                  })
                                }
                              />
                            ) : (
                              student.leetcodeUsername
                            )}
                          </TableCell>
                          <TableCell>
                            {!isEditing && (
                              <>
                                {!studentStats ? (
                                  <Badge variant="outline">No Data</Badge>
                                ) : hasError ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="destructive">Error</Badge>
                                    {studentStats.lastFetchError && (
                                      <span className="text-xs text-muted-foreground">
                                        {studentStats.lastFetchError}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="default">✓ OK</Badge>
                                )}
                              </>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={handleUpdateStudent}
                                  disabled={updating}
                                >
                                  {updating ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEdit(student)}
                                >
                                  Edit
                                </Button>
                                {hasError && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleRetry(
                                        student.id,
                                        student.leetcodeUsername
                                      )
                                    }
                                    disabled={retrying === student.id}
                                  >
                                    {retrying === student.id
                                      ? 'Retrying...'
                                      : 'Retry'}
                                  </Button>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteStudent(student.id)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedStudents.length)} of {sortedStudents.length} students
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
