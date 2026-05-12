import type { SQLiteDatabase } from 'expo-sqlite';

export type Seeder = {
  name: string;
  seed: (db: SQLiteDatabase) => Promise<void>;
};

const SEEDERS_TABLE = 'app_seeders';

const initContext = require.context('./init', false, /^\.\/\d{4}-.+\.ts$/);
const devContext = require.context('./dev', false, /^\.\/.+\.ts$/);

const initSeeders: Seeder[] = initContext
  .keys()
  .sort()
  .map((key) => initContext(key) as Seeder);

const devSeeders: Seeder[] = devContext
  .keys()
  .sort()
  .map((key) => devContext(key) as Seeder);

/**
 * Runs once per seeder per device. Tracked in app_seeders. Called from
 * SQLiteProvider's onInit after migrations.
 */
export async function runInitSeeders(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${SEEDERS_TABLE} (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied = await db.getAllAsync<{ name: string }>(`SELECT name FROM ${SEEDERS_TABLE}`);
  const appliedNames = new Set(applied.map((row) => row.name));

  for (const seeder of initSeeders) {
    if (appliedNames.has(seeder.name)) continue;

    await db.withTransactionAsync(async () => {
      await seeder.seed(db);
      await db.runAsync(`INSERT INTO ${SEEDERS_TABLE} (name) VALUES (?)`, seeder.name);
    });
  }
}

/**
 * Manually invoked. Each dev seeder must be idempotent (e.g. INSERT OR IGNORE).
 * Not tracked — same seeder can run any number of times without effect duplication.
 */
export async function runDevSeeders(db: SQLiteDatabase, only?: string) {
  const targets = only ? devSeeders.filter((s) => s.name === only) : devSeeders;
  for (const seeder of targets) {
    await db.withTransactionAsync(() => seeder.seed(db));
  }
}

export function listDevSeeders(): string[] {
  return devSeeders.map((s) => s.name);
}
