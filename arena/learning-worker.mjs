import { parentPort } from 'node:worker_threads';
import { runLearningJob } from './learning-runner.mjs';
parentPort.on('message', job => {
  try { parentPort.postMessage({ rows: runLearningJob(job) }); }
  catch (error) { parentPort.postMessage({ error: error.stack }); }
});
