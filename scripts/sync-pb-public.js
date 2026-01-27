import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const pbPublicDir = path.resolve(__dirname, '..', 'pocketbase', 'pb_public');

async function emptyDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? fs.rm(full, { recursive: true, force: true }) : fs.unlink(full);
    }));
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const link = await fs.readlink(srcPath);
      await fs.symlink(link, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  try {
    const distStat = await fs.stat(distDir).catch(() => null);
    if (!distStat || !distStat.isDirectory()) {
      console.error('[sync-pb-public] dist/ não encontrado. Execute o build antes.');
      process.exit(1);
    }

    await fs.mkdir(pbPublicDir, { recursive: true });
    console.log('[sync-pb-public] limpando pocketbase/pb_public...');
    await emptyDir(pbPublicDir);

    console.log('[sync-pb-public] copiando dist/ -> pocketbase/pb_public...');
    await copyDir(distDir, pbPublicDir);

    console.log('[sync-pb-public] feito.');
    process.exit(0);
  } catch (err) {
    console.error('[sync-pb-public] erro:', err);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('sync-pb-public.js')) {
  main();
}
