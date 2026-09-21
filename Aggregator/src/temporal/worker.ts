import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities/index.js';
import { TASK_QUEUE } from './taskQueue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
const MAX_CONNECT_ATTEMPTS = Number(process.env.TEMPORAL_CONNECT_MAX_ATTEMPTS ?? 40);
const CONNECT_RETRY_DELAY_MS = Number(process.env.TEMPORAL_CONNECT_RETRY_DELAY_MS ?? 3000);

// auto-setup's schema init on a cold Temporal server can easily take over a minute, so keep retrying generously
async function connectWithRetry(maxAttempts = MAX_CONNECT_ATTEMPTS, delayMs = CONNECT_RETRY_DELAY_MS): Promise<NativeConnection> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await NativeConnection.connect({ address: TEMPORAL_ADDRESS });
    } catch (error) {
      console.error(`Temporal connection attempt ${attempt}/${maxAttempts} failed:`, error);
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Unreachable');
}

// supports both `tsx watch` (.ts on disk) and the compiled `dist` build (.js only)
function resolveWorkflowsPath(): string {
  const tsPath = path.join(__dirname, 'workflows', 'hotelComparisonWorkflow.ts');
  const jsPath = path.join(__dirname, 'workflows', 'hotelComparisonWorkflow.js');
  return existsSync(tsPath) ? tsPath : jsPath;
}

async function run() {
  const connection = await connectWithRetry();
  const worker = await Worker.create({
    connection,
    workflowsPath: resolveWorkflowsPath(),
    activities,
    taskQueue: TASK_QUEUE,
  });
  console.log(`Temporal worker started on task queue "${TASK_QUEUE}"`);
  await worker.run();
}

run().catch((error) => {
  console.error('Aggregator worker failed to start:', error);
  process.exit(1);
});
