// Retain all per-bout measures, paired controls and one small decision excerpt.
// The runner's larger detail is reproducible and intentionally not needed to play.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const folder=resolve(process.argv[2]??resolve(dirname(fileURLToPath(import.meta.url)),'results'));
const bytes=readFileSync(resolve(folder,'summary.json')),data=JSON.parse(bytes);
const compact=Object.fromEntries(Object.entries(data).filter(([key])=>key!=='bouts'));
compact.detailSHA256=createHash('sha256').update(bytes).digest('hex');
compact.bouts=data.bouts.map(({examples,cognition,...row})=>({...row,
  maxBudgetSpent:cognition.maxBudgetSpent,tacticalLearningUpdates:cognition.learningUpdates,
  automaticDecisions:cognition.automaticDecisions}));
compact.decisionExamples=data.bouts[0].examples;
writeFileSync(resolve(folder,'compact-summary.json'),JSON.stringify(compact,null,2)+'\n');
