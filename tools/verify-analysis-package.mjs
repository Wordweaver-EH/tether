// Read-only verification. No analyzer, controller or outcome data is imported.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const ANALYZER_MANIFEST_SHA256 = '7d0cb0abe594be0f9ed267b02d4ae41951eaa128c5bb760cd6057f4f0b3f2632';
const instructions = 'See experimental/ANALYSIS-PACKAGE.md for the pinned data-checkpoint materialization steps.';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function readPackageFile(root, relativePath) {
  if (typeof relativePath !== 'string' || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(relativePath) || relativePath.split('/').some(p => p === '.' || p === '..')) {
    throw new Error(`Invalid package member path: ${relativePath}`);
  }
  let path = resolve(root);
  for (const part of relativePath.split('/')) {
    path = resolve(path, part);
    let stat;
    try { stat = lstatSync(path); }
    catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throw new Error(`Missing analyzer package data: ${relativePath}. ${instructions}`);
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`Analyzer package symlink is not allowed: ${relativePath}`);
  }
  if (!lstatSync(path).isFile()) throw new Error(`Analyzer package member is not a regular file: ${relativePath}`);
  return readFileSync(path);
}

// Exported for small synthetic integrity tests; the public CLI always pins the manifest first.
export function verifyManifestFiles(root, files) {
  if (!Array.isArray(files) || !files.length) throw new Error('Invalid analyzer package manifest');
  const seen = new Set();
  for (const file of files) {
    if (!file || seen.has(file.path) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid or duplicate analyzer package member');
    seen.add(file.path);
    const bytes = readPackageFile(root, file.path);
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) throw new Error(`Analyzer package hash/size mismatch: ${file.path}`);
  }
  return seen.size;
}

export function verifyAnalysisPackage(root) {
  if (!root) throw new Error(`Analyzer package is not bundled in this slim source checkout. ${instructions}`);
  const bytes = readPackageFile(root, 'SOURCE-MANIFEST.json');
  if (sha256(bytes) !== ANALYZER_MANIFEST_SHA256) throw new Error('Analyzer SOURCE-MANIFEST.json hash mismatch; require the exact pinned checkpoint');
  const count = verifyManifestFiles(root, JSON.parse(bytes).files);
  return {status: 'PINNED_ANALYZER_PACKAGE_VERIFIED', manifestSha256: ANALYZER_MANIFEST_SHA256, verifiedFiles: count + 1, outcomesRead: false};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node tools/verify-analysis-package.mjs ANALYZER_DIRECTORY');
    console.log(JSON.stringify(verifyAnalysisPackage(process.argv[2]), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
