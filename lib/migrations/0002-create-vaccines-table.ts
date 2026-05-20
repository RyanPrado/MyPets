import type { SQLiteDatabase } from 'expo-sqlite';

export const name = '0002-create-vaccines-table';

export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE vaccines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      date_given TEXT NOT NULL,
      amount_paid_cents INTEGER,
      next_due_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_vaccines_pet_id ON vaccines(pet_id);
  `);
}
