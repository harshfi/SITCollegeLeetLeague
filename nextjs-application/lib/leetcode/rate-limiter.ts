import pLimit from 'p-limit';
import { fetchLeetCodeStats } from './fetcher';
import { StudentStats } from '@/lib/types';

// Concurrency: 5 students at a time
// Delay between batches: 1000ms
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;
const PER_STUDENT_TIMEOUT_MS = 15000;

export interface FetchResult {
  username: string;
  stats?: StudentStats;
  error?: string;
}

async function fetchWithTimeout(
  username: string,
  timeoutMs: number
): Promise<StudentStats> {
  return Promise.race([
    fetchLeetCodeStats(username),
    new Promise<StudentStats>((_, reject) =>
      setTimeout(() => reject(new Error('Fetch timeout')), timeoutMs)
    ),
  ]);
}

export async function fetchMultipleUsersWithRateLimit(
  usernames: string[]
): Promise<FetchResult[]> {
  const limit = pLimit(BATCH_SIZE);
  const results: FetchResult[] = [];
  let batchIndex = 0;

  // Process in batches
  const batches: string[][] = [];
  for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
    batches.push(usernames.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    // Process this batch concurrently
    const batchPromises = batch.map((username) =>
      limit(async () => {
        try {
          const stats = await fetchWithTimeout(
            username,
            PER_STUDENT_TIMEOUT_MS
          );
          return { username, stats };
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          return { username, error: errorMsg };
        }
      })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Delay between batches (except after the last batch)
    batchIndex++;
    if (batchIndex < batches.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return results;
}
