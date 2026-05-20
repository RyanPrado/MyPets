import type { SQLiteDatabase } from 'expo-sqlite';

export type Migration = {
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

const MIGRATIONS_TABLE = 'app_migrations';

const context = require.context('./', false, /^\.\/\d{4}-.+\.ts$/);

const migrations: Migration[] = context
  .keys()
  .sort()
  .map((key) => context(key) as Migration);

export async function runMigrations(db: SQLiteDatabase) {
  await db.execAsync(`PRAGMA journal_mode = 'wal';`);
  // FKs are off by default per SQLite connection. Required for ON DELETE
  // CASCADE on vaccines.pet_id (introduced in 0002-create-vaccines-table).
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied = await db.getAllAsync<{ name: string }>(`SELECT name FROM ${MIGRATIONS_TABLE}`);
  const appliedNames = new Set(applied.map((row) => row.name));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) continue;

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.runAsync(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`, migration.name);
    });
  }
}
