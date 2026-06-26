'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Class } from '@/lib/types';
import { AdminShell } from '@/components/admin/AdminShell';

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch('/api/classes');
        if (!res.ok) throw new Error('Failed to fetch classes');
        const data = await res.json();
        setClasses(data);
      } catch (err) {
        setError('Failed to load classes');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchClasses();
  }, []);

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create class');
      }

      const newClass = await res.json();
      setClasses([...classes, newClass]);
      setFormData({ name: '', description: '' });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClass(classId: string) {
    if (!confirm('Delete this class and all its students?')) return;

    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete class');

      setClasses(classes.filter((c) => c.id !== classId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
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
        <h1 className="text-3xl font-bold tracking-tight">Manage Classes</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Class'}
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
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class-name">Class Name</Label>
                <Input
                  id="class-name"
                  placeholder="e.g., 2nd Year - CSE 3"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-desc">Description (optional)</Label>
                <Input
                  id="class-desc"
                  placeholder="Class description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <Button type="submit" disabled={saving || !formData.name}>
                {saving ? 'Creating...' : 'Create Class'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {classes.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground">
            No classes yet. Create one to get started!
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.studentCount}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClass(cls.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
    </AdminShell>
  );
}
