import { Client, Connection } from '@temporalio/client';
import { TASK_QUEUE } from './taskQueue.js';
import type { ApiHotel } from '../types/hotel.js';

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
const MAX_CONNECT_ATTEMPTS = Number(process.env.TEMPORAL_CONNECT_MAX_ATTEMPTS ?? 40);
const CONNECT_RETRY_DELAY_MS = Number(process.env.TEMPORAL_CONNECT_RETRY_DELAY_MS ?? 3000);

let clientPromise: Promise<Client> | null = null;

// auto-setup's schema init on a cold Temporal server can easily take over a minute, so keep retrying generously
async function connectWithRetry(maxAttempts = MAX_CONNECT_ATTEMPTS, delayMs = CONNECT_RETRY_DELAY_MS): Promise<Connection> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Connection.connect({ address: TEMPORAL_ADDRESS });
    } catch (error) {
      console.error(`Temporal client connection attempt ${attempt}/${maxAttempts} failed:`, error);
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Unreachable');
}

function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = connectWithRetry().then((connection) => new Client({ connection }));
  }
  return clientPromise;
}

export async function runHotelComparisonWorkflow(city: string): Promise<ApiHotel[]> {
  const client = await getClient();
  const result = await client.workflow.execute('hotelComparisonWorkflow', {
    taskQueue: TASK_QUEUE,
    workflowId: `hotel-comparison-${city.trim().toLowerCase()}-${Date.now()}`,
    args: [city],
  });
  return result as ApiHotel[];
}
