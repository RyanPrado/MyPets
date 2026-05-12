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

  const targets = [...new Set(candidates)].filter((p) => /\.(ts|tsx|js|jsx)$/i.test(p));
  if (targets.length === 0) process.exit(0);

  const quoted = targets.map((p) => JSON.stringify(p)).join(' ');
  const child = spawn(`npx --no-install eslint --fix ${quoted}`, {
    stdio: 'ignore',
    shell: true,
  });
  child.on('exit', () => process.exit(0));
  child.on('error', () => process.exit(0));
});
