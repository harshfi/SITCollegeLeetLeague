import { NextRequest, NextResponse } from 'next/server';
import * as studentService from '@/lib/services/studentService';
import * as classService from '@/lib/services/classService';
import { verifyAdminSession } from '@/lib/auth';
import { normalizeLeetCodeUsername } from '@/lib/utils';
import { ApiError } from '@/lib/types';

interface BulkResult {
  created: number;
  createdClasses: string[];
  failed: { line: number; value: string; error: string }[];
}

/** Minimal CSV parser supporting quoted fields and commas within quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<BulkResult | ApiError>> {
  try {
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      csv?: string;
      defaultClassId?: string;
    };
    if (!body.csv) {
      return NextResponse.json(
        { error: 'Validation error', details: 'csv is required' },
        { status: 400 }
      );
    }

    const rows = parseCsv(body.csv);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Validation error', details: 'No rows found in CSV' },
        { status: 400 }
      );
    }

    // Detect a header row and map columns.
    const header = rows[0].map((c) => c.trim().toLowerCase());
    const looksLikeHeader = header.some((h) =>
      ['name', 'username', 'leetcode', 'leetcodeusername', 'roll', 'rollnumber', 'class'].includes(h)
    );
    const dataRows = looksLikeHeader ? rows.slice(1) : rows;

    const col = (names: string[]) =>
      looksLikeHeader ? header.findIndex((h) => names.includes(h)) : -1;
    const nameIdx = looksLikeHeader ? col(['name']) : 0;
    const userIdx = looksLikeHeader
      ? col(['username', 'leetcode', 'leetcodeusername'])
      : 1;
    const rollIdx = looksLikeHeader ? col(['roll', 'rollnumber']) : 2;
    const classIdx = looksLikeHeader ? col(['class', 'classname']) : -1;

    // Class-name → id map for an optional per-row class column.
    const classes = await classService.getClasses();
    const classIdByName = new Map(
      classes.map((c) => [c.name.trim().toLowerCase(), c.id])
    );

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: any) => controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));

        try {
          const result: BulkResult = { created: 0, createdClasses: [], failed: [] };
          let line = looksLikeHeader ? 2 : 1;
          let processed = 0;
          const total = dataRows.length;

          send({ type: 'progress', processed, total, currentName: '' });

          for (const r of dataRows) {
            const name = (r[nameIdx] || '').trim();
            const username = normalizeLeetCodeUsername(r[userIdx] || '');
            const rollNumber = rollIdx >= 0 ? (r[rollIdx] || '').trim() : '';
            const classCell = classIdx >= 0 ? (r[classIdx] || '').trim() : '';

            let classId = '';
            if (classCell) {
              const key = classCell.toLowerCase();
              classId = classIdByName.get(key) || '';
              if (!classId) {
                try {
                  const created = await classService.createClass({ name: classCell });
                  classId = created.id;
                  classIdByName.set(key, classId);
                  result.createdClasses.push(classCell);
                } catch {
                  // leave classId empty
                }
              }
            } else {
              classId = body.defaultClassId || '';
            }

            const rowLabel = `${name || '?'} (${username || '?'})`;

            if (!name || !username) {
              result.failed.push({ line, value: rowLabel, error: 'Missing name or username' });
            } else if (!classId) {
              result.failed.push({ line, value: rowLabel, error: 'No class resolved' });
            } else {
              try {
                await studentService.createStudent({
                  classId,
                  name,
                  leetcodeUsername: username,
                  ...(rollNumber ? { rollNumber } : {}),
                });
                result.created++;
              } catch (err) {
                result.failed.push({
                  line,
                  value: rowLabel,
                  error: err instanceof Error ? err.message : 'Unknown error',
                });
              }
            }
            line++;
            processed++;
            send({ type: 'progress', processed, total, currentName: name || username });
          }

          send({ type: 'complete', result });
        } catch (error) {
          send({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { 
      headers: { 
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      } 
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bulk import failed:', error);
    return NextResponse.json(
      { error: 'Bulk import failed', details: message },
      { status: 500 }
    );
  }
}
