import { parentPort, workerData } from 'node:worker_threads';
import { runGameBout } from './core.mjs';

const adapter = await import(workerData.adapterUrl);
const variants = adapter.variantsForPolicy?.(workerData.policy) ?? adapter.variants;
const results = [];
for (const task of workerData.tasks) {
  const first = variants[task.first];
  const second = variants[task.second];
  const agents = [adapter.makeAgent(first, task.seed * 2 + 1, workerData.policy),
    adapter.makeAgent(second, task.seed * 2 + 2, workerData.policy)];
  const result = runGameBout({ game: adapter.game,
    adapter, agents, mode: task.mode, seed: task.seed,
    durationSec: task.durationSec });
  results.push({ ...task, score: result.score, metrics: result.metrics,
    elapsedSec: result.elapsedSec });
}
parentPort.postMessage(results);
