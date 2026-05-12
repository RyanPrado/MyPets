import type { SQLiteDatabase } from 'expo-sqlite';

import { SPECIES } from '@/lib/constants/species';

export const name = '0001-create-pets-table';

export async function up(db: SQLiteDatabase) {
  const speciesList = SPECIES.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');

  await db.execAsync(`
    CREATE TABLE pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      species TEXT NOT NULL CHECK (species IN (${speciesList})),
      birth_date TEXT,
      photo_uri TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
