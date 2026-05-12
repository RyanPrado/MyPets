#!/usr/bin/env node
/**
 * Scaffolds new migration / init seeder / dev seeder files.
 *
 *   node scripts/db-make.js migration   "create pets table"
 *   node scripts/db-make.js seeder:init "default species"
 *   node scripts/db-make.js seeder:dev  "test pets"
 *
 * Numbered subcommands (migration, seeder:init) auto-increment the prefix
 * based on existing files. Dev seeders are not numbered.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const TARGETS = {
  migration: {
    dir: path.join(ROOT, 'lib', 'migrations'),
    numbered: true,
    template: migrationTemplate,
  },
  'seeder:init': {
    dir: path.join(ROOT, 'lib', 'seeders', 'init'),
    numbered: true,
    template: initSeederTemplate,
  },
  'seeder:dev': {
    dir: path.join(ROOT, 'lib', 'seeders', 'dev'),
    numbered: false,
    template: devSeederTemplate,
  },
};

function main() {
  const [, , subcommand, ...descriptionParts] = process.argv;

  if (!subcommand || !TARGETS[subcommand]) {
    fail(`Usage: node scripts/db-make.js <migration|seeder:init|seeder:dev> "<description>"`);
  }

  const description = descriptionParts.join(' ').trim();
  if (!description) {
    fail('Missing description. Example: node scripts/db-make.js migration "create pets table"');
  }

  const target = TARGETS[subcommand];
  const slug = toKebabCase(description);
  if (!slug) fail(`Description "${description}" produced an empty slug.`);

  const filename = target.numbered
    ? `${nextNumber(target.dir).toString().padStart(4, '0')}-${slug}.ts`
    : `${slug}.ts`;

  const fullPath = path.join(target.dir, filename);
  if (fs.existsSync(fullPath)) {
    fail(`File already exists: ${path.relative(ROOT, fullPath)}`);
  }

  const exportedName = filename.replace(/\.ts$/, '');
  fs.writeFileSync(fullPath, target.template(exportedName), 'utf8');

  console.log(`Created ${path.relative(ROOT, fullPath)}`);
}

function toKebabCase(input) {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nextNumber(dir) {
  if (!fs.existsSync(dir)) return 1;
  const entries = fs.readdirSync(dir);
  let max = 0;
  for (const entry of entries) {
    const match = /^(\d{4})-/.exec(entry);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function migrationTemplate(name) {
  return `import type { SQLiteDatabase } from 'expo-sqlite';

export const name = '${name}';

export async function up(db: SQLiteDatabase) {
  // TODO: write your schema change
  // await db.execAsync(\`CREATE TABLE ...;\`);
  void db;
}
`;
}

function initSeederTemplate(name) {
  return `import type { SQLiteDatabase } from 'expo-sqlite';

export const name = '${name}';

export async function seed(db: SQLiteDatabase) {
  // TODO: insert initial data the app needs to function
  // await db.runAsync(\`INSERT INTO ... VALUES (?)\`, value);
  void db;
}
`;
}

function devSeederTemplate(name) {
  return `import type { SQLiteDatabase } from 'expo-sqlite';

export const name = '${name}';

// Must be idempotent — runs many times. Use INSERT OR IGNORE,
// INSERT OR REPLACE, or DELETE-then-INSERT.
export async function seed(db: SQLiteDatabase) {
  // TODO: populate test/development data
  void db;
}
`;
}

main();
