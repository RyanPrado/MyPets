#!/usr/bin/env node
import { spawn } from 'node:child_process';

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const input = payload?.tool_input ?? {};
  const candidates = [];
  if (typeof input.file_path === 'string') candidates.push(input.file_path);
  if (Array.isArray(input.edits)) {
    for (const edit of input.edits) {
      if (typeof edit?.file_path === 'string') candidates.push(edit.file_path);
    }
  }

  const touchedTs = candidates.some((p) => /\.(ts|tsx)$/i.test(p));
  if (!touchedTs) process.exit(0);

  // tsc with paths aliases (`@/*`) needs the whole project, not just one file.
  // Project is small, so full --noEmit completes quickly.
  const child = spawn(`npx --no-install tsc --noEmit --pretty false`, {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  child.on('error', () => process.exit(0));
});
