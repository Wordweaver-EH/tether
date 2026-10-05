// Transport-only utility: reconstruct the exact original-v2 evidence gzip.
// Uses Node built-ins, validates all input and output hashes, never overwrites.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, open, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = { parts: resolve(root, 'reports/final'), out: null };
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i]?.replace(/^--/, '');
  if (!['parts', 'out'].includes(key) || !process.argv[i + 1]) {
    throw new Error('Usage: node tools/reassemble-phase5.mjs [--parts DIRECTORY] [--out FILE]');
  }
  options[key] = resolve(process.argv[i + 1]);
}
const manifest = JSON.parse(await readFile(resolve(options.parts, 'phase5-final.transport.json'), 'utf8'));
const safeName = name => typeof name === 'string' && /^[A-Za-z0-9_.-]+$/.test(name) && !['.', '..'].includes(name);
if (manifest.schema !== 'tether-split-file-v1' || !safeName(manifest.original?.file) ||
    !Array.isArray(manifest.parts) || !manifest.parts.length ||
    manifest.parts.some(part => !safeName(part.file))) throw new Error('Invalid transport manifest');
const output = options.out ?? resolve(options.parts, manifest.original.file);
const combined = createHash('sha256'); let combinedBytes = 0;
for (const part of manifest.parts) {
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(resolve(options.parts, part.file))) {
    hash.update(chunk); combined.update(chunk); bytes += chunk.length;
  }
  if (bytes !== part.bytes || hash.digest('hex') !== part.sha256) throw new Error(`Invalid part: ${part.file}`);
  combinedBytes += bytes;
}
if (combinedBytes !== manifest.original.bytes || combined.digest('hex') !== manifest.original.sha256) {
  throw new Error('Combined evidence differs from the original gzip');
}
async function verifyOutput() {
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(output)) { hash.update(chunk); bytes += chunk.length; }
  if (bytes !== manifest.original.bytes || hash.digest('hex') !== manifest.original.sha256) {
    throw new Error('Output already exists or was changed and differs from the original; it was not overwritten');
  }
}
let handle;
try { handle = await open(output, 'wx'); }
catch (error) {
  if (error.code !== 'EEXIST') throw error;
  await verifyOutput();
  console.log(`Already verified: ${output}\nSHA-256: ${manifest.original.sha256}`);
  process.exit(0);
}
try {
  for (const part of manifest.parts) {
    for await (const chunk of createReadStream(resolve(options.parts, part.file))) await handle.writeFile(chunk);
  }
  await handle.close(); handle = null;
  await verifyOutput();
} catch (error) {
  if (handle) await handle.close();
  await unlink(output).catch(() => {});
  throw error;
}
console.log(`Reassembled and verified: ${output}\nSHA-256: ${manifest.original.sha256}`);
