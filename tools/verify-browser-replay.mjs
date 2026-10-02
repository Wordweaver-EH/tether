import { readFileSync } from 'node:fs';
import { replayFromLog } from '../src/log.js';
if (!process.argv[2]) throw new Error('Usage: node tools/verify-browser-replay.mjs browser-log.jsonl');
const { verifiedSamples, finalHash, world } = replayFromLog(readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({ verifiedSamples, finalHash, ticks: world.tick, node: process.version }, null, 2));
