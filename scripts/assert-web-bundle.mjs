import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.argv[2];
if (!root) throw new Error('Usage: node scripts/assert-web-bundle.mjs <export-directory>');

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? javascriptFiles(path) : extname(path) === '.js' ? [path] : [];
  }));
  return files.flat();
}

const forbiddenNativeNotificationMarkers = [
  'expo-notifications',
  'ExpoPushTokenManager',
  'getExpoPushTokenAsync',
  'scheduleNotificationAsync',
];
const files = await javascriptFiles(root);
if (files.length === 0) throw new Error(`No JavaScript bundles found under ${root}`);

const contents = await Promise.all(files.map(file => readFile(file, 'utf8')));
const matches = forbiddenNativeNotificationMarkers.filter(marker =>
  contents.some(content => content.includes(marker))
);
if (matches.length > 0) {
  throw new Error(`Native notification code leaked into the web bundle: ${matches.join(', ')}`);
}

console.log(`Verified ${files.length} web bundle(s): native notification code is absent.`);
