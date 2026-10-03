import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const hash = b => createHash('sha256').update(b).digest('hex');
const manifest = JSON.parse(await readFile(resolve(root, 'transport.json'), 'utf8'));
for (const archive of manifest.archives) {
  const chunks = [];
  for (const part of archive.parts) {
    if (!/^[a-zA-Z0-9._-]+$/.test(part.filename)) throw new Error('Invalid part name');
    const bytes = await readFile(resolve(root, part.filename));
    if (bytes.length !== part.bytes || hash(bytes) !== part.sha256) throw new Error(`Corrupt part: ${part.filename}`);
    chunks.push(bytes);
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(archive.filename)) throw new Error('Invalid archive name');
  const bytes = Buffer.concat(chunks);
  if (bytes.length !== archive.bytes || hash(bytes) !== archive.sha256) throw new Error(`Corrupt archive: ${archive.filename}`);
  await writeFile(resolve(root, archive.filename), bytes);
  console.log(`${archive.filename}: ${bytes.length} bytes; SHA-256 ${archive.sha256}`);
}
