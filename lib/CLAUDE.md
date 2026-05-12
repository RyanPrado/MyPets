# lib/CLAUDE.md — Data Layer Conventions

Read this **before touching any file under `lib/`**. The data layer has invariants that aren't obvious from the code alone, and breaking them silently corrupts data on devices already in the wild.

## Architecture

- **SQLite is the single source of truth** for persistent data. There is no in-memory cache, no parallel store. Components read from the DB via `useSQLiteContext()` and write via the same connection.
- **Migrations** evolve the schema. **Init seeders** populate data the app needs to function (categories, defaults, reference data). **Dev seeders** populate test/demo data.
- **`SQLiteProvider`** in `app/_layout.tsx` opens the DB once and runs migrations + init seeders on every start (idempotent — already-applied work is skipped).
- Tracking lives in two SQLite tables managed by the runners:
  - `app_migrations(name TEXT PRIMARY KEY, applied_at TEXT)` — written by `lib/migrations/index.ts` after each successful migration.
  - `app_seeders(name TEXT PRIMARY KEY, applied_at TEXT)` — written by `lib/seeders/index.ts` after each successful init seeder. Dev seeders are NOT tracked here.

## File-per-migration with auto-discovery

Migrations live as individual files under `lib/migrations/` named `NNNN-kebab-description.ts`. The runner uses Metro's `require.context()` to discover them at bundle time — **you do NOT register migrations manually anywhere**. Adding the file is the registration.

Each migration file exports exactly two named exports:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export const name = '0001-create-pets';

export async function up(db: SQLiteDatabase) {
  await db.execAsync(`...`);
}
```

The `name` constant **must** equal the filename without `.ts`. The scaffolder enforces this; do not diverge.

## Init seeders vs dev seeders

|           | Init (`lib/seeders/init/`)                                        | Dev (`lib/seeders/dev/`)                          |
| --------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| Filename  | `NNNN-kebab.ts` (numbered)                                        | `kebab.ts` (no number)                            |
| Tracked   | Yes — `app_seeders` table                                         | No                                                |
| When runs | `onInit`, after migrations, on every app start                    | Manually, via `runDevSeeders(db)`                 |
| Repeats   | Once per device, ever                                             | Many times — must be idempotent                   |
| Use for   | Default rows the app needs (categories, settings, reference data) | Test pets, demo data, fixtures during development |

Both file shapes are identical: `export const name` + `export async function seed(db)`. Runners are in `lib/seeders/index.ts`.

Dev seeders are responsible for their own idempotency. Use `INSERT OR IGNORE`, `INSERT OR REPLACE`, or `DELETE` then `INSERT`. **Never assume the DB is empty when a dev seeder starts.**

## Critical rules

These are the rules that, if violated, cause silent data corruption on already-deployed devices. They are non-negotiable.

1. **Never edit a migration that has been committed.** If a device already has the row in `app_migrations`, the runner skips it forever. The "fix" you make to the SQL never applies, and that device's schema diverges from fresh installs. **Always write a new migration instead.**
2. **Update `lib/db-types.ts` in the same change as a schema migration.** The TS type must mirror the SQL exactly: `NOT NULL` columns are non-optional, nullable columns include `| null`, enum-like columns become string literal unions matching the `CHECK` constraint. There is no automatic inference — the type is the manual contract.
3. **Never concatenate values into SQL strings.** Always use parameterized queries (`?` placeholders + an array of params). The codebase has zero exceptions to this rule.
4. **Wrap multi-statement schema changes in transactions.** The runners already wrap each migration/seeder in `withTransactionAsync`. If you write code outside the runners that does multi-step DB work, do the same.
5. **Don't bypass the runners.** No `db.execAsync('CREATE TABLE ...')` from inside a screen component. All schema changes go through migrations.

## Commands

```bash
npm run make:migration -- "<description>"   # → lib/migrations/NNNN-kebab.ts
npm run make:seed:init  -- "<description>"  # → lib/seeders/init/NNNN-kebab.ts
npm run make:seed:dev   -- "<description>"  # → lib/seeders/dev/kebab.ts
```

The `--` is required for `npm` to forward the description through to the script. The scaffolder auto-detects the next `NNNN` for numbered targets, slugifies the description, and refuses to overwrite existing files.

## Schema conventions for SQLite

When writing migrations, follow these conventions consistently:

- **Primary keys**: `id INTEGER PRIMARY KEY AUTOINCREMENT`. The `AUTOINCREMENT` keyword prevents ID reuse after `DELETE` — important for entities referenced by foreign keys.
- **Timestamps**: `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`. SQLite stores timestamps as ISO strings.
- **Enum-like columns**: `species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other'))`. SQLite has no native enum type; `CHECK` constraints enforce the rule. The TS type must use a matching string literal union.
- **Foreign keys**: SQLite requires `PRAGMA foreign_keys = ON` per connection (the WAL pragma we set is unrelated). When adding the first FK, add `PRAGMA foreign_keys = ON;` to the runner. Use explicit `ON DELETE CASCADE` or `ON DELETE SET NULL` — there is no "right default."
- **Indexes**: add `CREATE INDEX` statements for columns used in `WHERE` clauses or `ORDER BY`, especially foreign key columns.
- **Default values**: prefer `DEFAULT` clauses in SQL over inserting defaults from TS. Keeps the schema self-documenting.

## SQLite gotchas

- **You cannot easily DROP or RENAME columns.** SQLite supports `ALTER TABLE ... ADD COLUMN` and `ALTER TABLE ... RENAME TO`, but not `DROP COLUMN` (only since 3.35) or `RENAME COLUMN` (only since 3.25). The version shipped with `expo-sqlite` may or may not support them. The safe pattern is the 12-step "rebuild table" approach: create a new table, copy rows, drop old, rename new. Do this only as a last resort.
- **Type affinity, not strict typing.** SQLite will accept a string into an `INTEGER` column. `CHECK` constraints are your enforcement.
- **Booleans** don't exist — store as `INTEGER` (0/1). The TS type is `boolean`; convert at the query boundary.

## Worked example — adding a new entity

Goal: add a `pets` table with id, name, species, optional birth date.

```bash
npm run make:migration -- "create pets table"
```

The scaffolder prints the path it created, e.g. `lib/migrations/0001-create-pets-table.ts`. Edit it:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

export const name = '0001-create-pets-table';

export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
      birth_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
```

In the **same change**, update `lib/db-types.ts` (create it if it doesn't exist):

```ts
export type Pet = {
  id: number;
  name: string;
  species: 'dog' | 'cat' | 'other';
  birth_date: string | null;
  created_at: string;
};
```

Restart the dev server so the bundler picks up the new file (`require.context` runs at bundle time, not on hot reload of unrelated files):

```bash
# Ctrl+C, then:
npm start
```

On the next app open, the runner sees `0001-create-pets-table` is not in `app_migrations`, runs the `up` function in a transaction, and inserts the row. Subsequent opens skip it.

## Where the code lives

```
lib/
├── db.ts                      DATABASE_NAME constant + useSQLiteContext re-export
├── migrations/
│   ├── index.ts               runner — DO NOT touch unless changing the system
│   └── NNNN-*.ts              one per schema change
├── seeders/
│   ├── index.ts               runners — DO NOT touch unless changing the system
│   ├── init/NNNN-*.ts         one per init seeder
│   └── dev/*.ts               one per dev seeder
├── db-types.ts                (creates on first entity) entity types — must match schema
└── types/require-context.d.ts type aug for Metro's require.context
```

When in doubt, read `lib/migrations/index.ts` and `lib/seeders/index.ts` — they are short and describe exactly what gets applied and when.
