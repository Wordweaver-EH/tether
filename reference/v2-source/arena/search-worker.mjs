import { parentPort, workerData } from 'node:worker_threads';
import { runGameBout } from './core.mjs';

const search = await import(workerData.adapterUrl);
const game = search.gameFor(workerData.condition);
parentPort.on('message', (tasks) => {
  try {
    const results = tasks.map((task) => {
      const agents = [search.makeSearchAgent(task.first, task.seed * 2 + (task.first.name === task.candidateName ? 1 : 2),
        workerData.condition),
        search.makeSearchAgent(task.second, task.seed * 2 + (task.second.name === task.candidateName ? 1 : 2),
          workerData.condition)];
      const result = runGameBout({ game, adapter: search.adapter, agents,
        mode: task.mode, seed: task.seed, durationSec: task.seconds });
      return { ...task, score: result.score, metrics: result.metrics };
    });
    parentPort.postMessage({ results });
  } catch (error) { parentPort.postMessage({ error: error.stack }); }
});
