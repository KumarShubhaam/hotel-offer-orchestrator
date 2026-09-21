import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/index.js';
import { dedupeHotels } from '../../services/dedupe.js';

const { fetchSupplierAHotels, fetchSupplierBHotels } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5s',
  retry: { maximumAttempts: 3, initialInterval: '500ms', backoffCoefficient: 2 },
});

const { cacheDedupedHotels } = proxyActivities<typeof activities>({
  startToCloseTimeout: '3s',
  retry: { maximumAttempts: 2 },
});

export async function hotelComparisonWorkflow(city: string) {
  // allSettled (not all) so one dead supplier degrades to "empty list" instead of failing the whole request
  const [resultA, resultB] = await Promise.allSettled([
    fetchSupplierAHotels(city),
    fetchSupplierBHotels(city),
  ]);

  const hotelsA = resultA.status === 'fulfilled' ? resultA.value : [];
  const hotelsB = resultB.status === 'fulfilled' ? resultB.value : [];

  const deduped = dedupeHotels(hotelsA, hotelsB);

  try {
    await cacheDedupedHotels(city, deduped);
  } catch {
    // caching is best-effort, must not fail the request
  }

  return deduped;
}
