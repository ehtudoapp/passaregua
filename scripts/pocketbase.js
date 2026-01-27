import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const executable = isWindows ? 'pocketbase.exe' : 'pocketbase';
const cwd = path.resolve(__dirname, '..', 'pocketbase');
const binaryPath = path.resolve(cwd, executable);

if (!fs.existsSync(binaryPath)) {
  console.error(`[pocketbase] binary not found at ${binaryPath}`);
  process.exit(1);
}

const args = process.argv.slice(2); // Pega os argumentos após "node script.js"

const child = spawn(binaryPath, ['serve', ...args], {
  cwd,
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[pocketbase] failed to start:', error);
  process.exit(1);
});