---
name: db-migration
description: Create a new SQLite schema migration end-to-end — scaffold the file, write the SQL, update lib/db-types.ts in lockstep, and validate. Handles CREATE TABLE, ALTER TABLE ADD COLUMN, and CREATE INDEX. Read lib/CLAUDE.md for conventions before invoking.
disable-model-invocation: true
---

# db-migration

User invokes as `/db-migration <description of the change>`. Examples:

- `/db-migration create pets table`
- `/db-migration add photo_uri to pets`
- `/db-migration index pets by owner_id`
- `/db-migration create vaccines table referencing pets`

Your job is to make the migration **and** keep the TypeScript types in sync. The biggest reason to use a skill instead of doing this manually is that humans (and unguided agents) routinely forget to update `lib/db-types.ts` — leading to TS types that lie about what the DB contains. This skill never lets that drift happen.

## Procedure

### 1. Read the conventions before doing anything

The data layer has invariants documented in `lib/CLAUDE.md`. Read it first if you haven't already this session. Pay particular attention to:

- The "Critical rules" section (never edit committed migrations, parameterized queries, etc.)
- The "Schema conventions for SQLite" section (PK style, timestamps, enums via `CHECK`, FK behavior)
- The "SQLite gotchas" section (no easy `DROP COLUMN`, type affinity, booleans as INTEGER)

If `lib/CLAUDE.md` has been removed or significantly altered, stop and tell the user before proceeding.

### 2. Classify the change

The migration is one of:

| Kind                       | Example                            | Schema verb                      | TS type change                                                                                         |
| -------------------------- | ---------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Create table               | `create pets table`                | `CREATE TABLE`                   | Add new type to `db-types.ts`                                                                          |
| Add column                 | `add photo_uri to pets`            | `ALTER TABLE pets ADD COLUMN`    | Add field to existing type                                                                             |
| Add index                  | `index pets by owner_id`           | `CREATE INDEX`                   | None                                                                                                   |
| Add foreign key constraint | `create vaccines referencing pets` | `CREATE TABLE` with `REFERENCES` | Add new type; if no FK existed before, also enable `PRAGMA foreign_keys = ON` (see Foreign keys below) |
| Drop or rename column      | `drop ... column` / `rename ...`   | **STOP — see Drop/rename below** | —                                                                                                      |

If the request doesn't fit one of these, ask the user to clarify before generating SQL.

### 3. Plan the SQL and the type — out loud, briefly

Before writing files, post a short plan to the user (one paragraph + a fenced SQL block + the proposed TS type). They might want to adjust nullability, change an enum's values, or rename a column. Cheap to confirm; expensive to undo.

Apply the schema conventions from `lib/CLAUDE.md`:

- Primary keys: `id INTEGER PRIMARY KEY AUTOINCREMENT`.
- Timestamps: `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`. Add `updated_at` only if the user mentions tracking modifications.
- Enums: `CHECK (column IN ('a', 'b', ...))`. The TS type uses a string literal union with the same values.
- Nullability: be deliberate. Default to `NOT NULL` unless there is a reason. Reflect with `| null` only when nullable.
- Foreign keys: `REFERENCES other_table(id) ON DELETE <CASCADE|SET NULL|RESTRICT>`. Choose explicitly — never omit `ON DELETE`.

### 4. Run the scaffolder

```bash
npm run make:migration -- "<description>"
```

The script prints the path of the file it created. Note the path; you'll edit it next. **Never** invent a filename or number yourself — always go through the scaffolder so numbering stays consistent.

### 5. Write the migration file

Open the generated file and replace the TODO block with the planned SQL inside `db.execAsync(...)`. Do **not** change the exported `name` constant or the file's name; the scaffolder set them correctly and they must match each other and the filename.

For multi-statement schema changes (e.g. `CREATE TABLE` + `CREATE INDEX`), they can all live inside a single `execAsync` template string separated by semicolons. The runner already wraps the migration in a transaction.

### 6. Update `lib/db-types.ts` in the same change

If `lib/db-types.ts` does not exist yet, create it.

Add a TypeScript type that mirrors the schema **exactly**:

- Column `INTEGER` → `number`
- Column `TEXT` → `string`
- Column allowing NULL → field union with `| null`
- Column with `CHECK (col IN ('a', 'b'))` → field type `'a' | 'b'`
- Booleans stored as `INTEGER` (0/1) → field type `boolean`, with a comment noting the storage convention if non-obvious
- Timestamps stored as `TEXT` → `string` (ISO-8601)

For ALTER migrations that add a column, modify the existing type. For DROP-style operations, read the warning below.

### 7. Foreign keys — first time only

If this is the first migration in the codebase that introduces a `REFERENCES ... ON DELETE ...` clause, you must also enable foreign key enforcement, which SQLite leaves OFF by default per connection. Add to `lib/migrations/index.ts` at the top of `runMigrations` (just under the WAL pragma):

```ts
await db.execAsync(`PRAGMA foreign_keys = ON;`);
```

Skip this step if the pragma is already there — re-running it is harmless but adds noise. Mention to the user that you added it if you did.

### 8. Validate

Run, in this order:

1. `npm run typecheck` — confirms `db-types.ts` compiles.
2. `npm run lint` — confirms ESLint passes on the new files.
3. `npx prettier --write <generated migration> lib/db-types.ts` — formats consistently.

If any step fails, do not declare done. Read the error, fix it, re-run.

### 9. Report

Output a concise summary:

- File created and its path.
- File modified (`lib/db-types.ts`) and what changed.
- Whether `PRAGMA foreign_keys = ON` was added.
- One reminder: **the migration only applies on next app start** — the user should restart `npm start` (Ctrl+C then `npm start`) so Metro picks up the new file via `require.context`.

Don't restate the SQL or paste the type back; the user has the diff.

## Drop / rename column — STOP

SQLite supports `ALTER TABLE ... DROP COLUMN` only since 3.35 and `RENAME COLUMN` only since 3.25. The version bundled with the user's `expo-sqlite` may or may not support them, and behavior on the New Architecture is occasionally inconsistent. The safe portable approach is the **12-step rebuild table dance**:

1. `BEGIN TRANSACTION;`
2. `PRAGMA foreign_keys = OFF;` (temporarily, to allow renaming)
3. `CREATE TABLE pets_new (...)` with the desired schema.
4. `INSERT INTO pets_new (id, name, ...) SELECT id, name, ... FROM pets;`
5. `DROP TABLE pets;`
6. `ALTER TABLE pets_new RENAME TO pets;`
7. Recreate indexes and triggers that referenced the old table.
8. `PRAGMA foreign_key_check;` to verify nothing dangling.
9. `PRAGMA foreign_keys = ON;`
10. `COMMIT;`

Do **not** attempt this without explicit user confirmation. Ask: _"This requires rebuilding the table (the SQLite portable approach for column drops). Confirm to proceed?"_ Only continue if the user explicitly confirms.

## Seeders are out of scope

This skill creates **migrations**. For init seeders or dev seeders, the user should run:

- `npm run make:seed:init -- "<description>"` (auto-runs on every app start, tracked)
- `npm run make:seed:dev -- "<description>"` (manually invoked, must be idempotent)

Do not silently extend this skill to handle seeders. If the user requests a seeder under `/db-migration`, redirect them to the correct command.

## When _not_ to use this skill

- For data manipulation that isn't a schema change — that's seeders or in-app code.
- For ad-hoc SQL exploration — use a SQLite client against the device DB file via `expo-dev-client` tools.
- For renaming the database itself — that requires a manual data export/import; ask first.
