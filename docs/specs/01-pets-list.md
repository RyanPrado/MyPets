# 01 — Pets List

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Status         | Approved (mockup) · Pending implementation             |
| Route          | `app/(tabs)/index.tsx` (replaces existing boilerplate) |
| Depends on     | —                                                      |
| Tables touched | `pets` (read)                                          |

## Purpose

Tab home of the MyPets app. Lists all pets the tutor has registered. Entry point to drill into a specific pet's detail (Pet Detail), add a new pet (Pet Form), or perform per-pet actions via long-press → bottom sheet (Edit / Delete).

The screen has three visually distinct states. The **empty state** (zero rows in `pets`) is shown on first launch and after the tutor deletes their last pet. The **populated state** is the steady state. The **action sheet open state** is a transient overlay triggered by long-press on a pet row.

## Wireframe

Primary populated state:

```text
+--------------------------+
|  Os meus pets       [+]  |  ← header: title + add_circle button
+--------------------------+
|  [R] Rex                 |
|      Cão · 6 anos        |
+--------------------------+
|  [L] Luna                |
|      Gato · 3 anos       |
+--------------------------+
|  [B] Bilbo               |
|      Cão · 2 anos        |
+--------------------------+
|  ...                     |  ← FlatList scrollable
+--------------------------+
|  Toca para abrir ·       |
|  mantém para opções      |  ← subtle muted-foreground hint
+--------------------------+
| [Home active]  Explore   |  ← tab bar
+--------------------------+
```

The empty state replaces the list region with a centred column: large `pawprint.fill` icon in `muted-foreground`, title "Ainda não tens pets", paragraph "Adiciona o teu primeiro pet para começares a registar vacinas e cuidados.", and a primary CTA button "+ Adicionar pet". Header and tab bar remain visible.

The action sheet state: the entire screen dims to ~45% scrim opacity; a bottom sheet (managed by `@gorhom/bottom-sheet`) slides up with a drag handle, a pet preview row (`Avatar` + name + meta), and two action rows — "Editar pet" (neutral, `edit` icon) and "Apagar pet" (destructive, `delete` icon, `text-destructive`). Tap on scrim or swipe-down dismisses.

## Components

### Existing primitives reused

- `<View>` and `<Pressable>` from `react-native`, styled with Tailwind classes (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`).
- `<FlatList>` from `react-native` for the pet list (better perf than `ScrollView` for variable-length data; built-in `RefreshControl` support).
- `<IconSymbol>` (existing component at `components/ui/icon-symbol.tsx`) — pass SF Symbol names; the component routes to MaterialIcons on Android/web via the `MAPPING` constant.
- `<Tabs>` from `expo-router` (already configured in `app/(tabs)/_layout.tsx`).

### New components to create

- **`Avatar`** (`components/avatar.tsx`) — circular initial-based placeholder. Props: `name: string`, `size?: 'sm' | 'md' | 'lg'` (default `md` = 40 px). Renders a coloured circle with the first letter of `name` (uppercased, NFD-stripped for accented chars). Background colour derived from `name` via a deterministic hash → index into a 6-tone palette (teal, rose, green, purple, amber, sky) compatible with both light and dark mode. Foreground is `--color-primary-foreground` (white).
- **`EmptyState`** (`components/empty-state.tsx`) — generic empty-state layout. Props: `icon: IconSymbolName`, `title: string`, `description: string`, `actionLabel?: string`, `onAction?: () => void`. Centred flex column with icon (size 56), title (`text-foreground` semibold), description (`text-muted-foreground` body), optional primary CTA.
- **`PetActionsSheet`** (`components/pet-actions-sheet.tsx`) — wraps `BottomSheetModal` from `@gorhom/bottom-sheet`. Imperative API via `forwardRef` exposing `present(pet)` / `dismiss()`. Props for callbacks: `onEdit: (pet: Pet) => void`, `onDelete: (pet: Pet) => void`. Renders preview row + two action `Pressable`s.

### Icon mapping entries to add to `components/ui/icon-symbol.tsx`

| SF Symbol (iOS)     | Material Symbol fallback (Android/web) |
| ------------------- | -------------------------------------- |
| `plus.circle.fill`  | `add-circle`                           |
| `plus`              | `add`                                  |
| `pawprint.fill`     | `pets`                                 |
| `square.and.pencil` | `edit`                                 |
| `trash`             | `delete`                               |

### New theme tokens needed

None. The existing seed tokens are sufficient.

## Data

### Queries

```sql
SELECT id, name, species, birth_date, photo_uri
FROM pets
ORDER BY name COLLATE NOCASE;
```

Result typed as `Pet[]` from `lib/db-types.ts`. The query runs on initial mount, on `useFocusEffect` (re-fetch when returning from Pet Form), and on pull-to-refresh. Age (e.g. "6 anos") is computed in JS from `birth_date` for display — no DB column.

### Mutations

None on this screen directly. Delete (triggered from the action sheet) issues:

```sql
DELETE FROM pets WHERE id = ?;
```

Wrapped in `Alert.alert` confirmation. On success, refetch the list.

### Migrations required

- **`0001-create-pets-table`** — first migration of the codebase. Schema:

  ```sql
  CREATE TABLE pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    species TEXT NOT NULL CHECK (species IN ('Cão', 'Gato', 'Coelho', 'Hamster', 'Cobaia', 'Rato', 'Furão', 'Periquito', 'Canário', 'Papagaio', 'Tartaruga', 'Iguana', 'Cobra', 'Peixe', 'Outro')),
    birth_date TEXT,
    photo_uri TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  ```

  The `CHECK` clause should be generated from the `SPECIES` constant by `Array.prototype.map` in the migration's `up` function to avoid duplicating the list. Scaffolded via `/db-migration "create pets table"`. The accompanying `lib/db-types.ts` should export `Pet` typed as `{ id: number; name: string; species: (typeof SPECIES)[number]; birth_date: string | null; photo_uri: string | null; created_at: string }`.

## Interactions

| Trigger                            | Action                                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Tap a pet row                      | Navigate to `/pet/[id]` (Pet Detail). Use `router.push({ pathname: '/pet/[id]', params: { id } })`.                                     |
| Tap header `+`                     | Navigate to `/pet-form` (Pet Form modal, create mode).                                                                                  |
| Long-press a pet row               | Call `petActionsSheetRef.current?.present(pet)`. Use `onLongPress` on the row's `Pressable`.                                            |
| In sheet: "Editar pet"             | Dismiss sheet, navigate to `/pet-form?id=<petId>` (edit mode).                                                                          |
| In sheet: "Apagar pet"             | Dismiss sheet, call `Alert.alert('Apagar?', 'Esta acção é irreversível.', [Cancelar, Apagar])`. On confirm: run `DELETE`, refetch list. |
| Tap scrim or swipe sheet down      | Dismiss sheet (built-in `@gorhom/bottom-sheet` behavior).                                                                               |
| Empty state: tap "+ Adicionar pet" | Navigate to `/pet-form` (same as header `+`).                                                                                           |
| Pull to refresh                    | Refetch the query. Spinner via `RefreshControl`.                                                                                        |
| Return from Pet Form (`useFocus`)  | Refetch the query. Catches newly created/edited pets without a manual refresh.                                                          |

## States

| State        | When                                       | UI                                                                                                                           |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Loading      | Initial render before first query resolves | Three skeleton rows: `bg-card` rounded rectangles with the `Avatar`-sized circle and two text bars. Acceptable for MVP.      |
| Empty        | Query returns 0 rows                       | `<EmptyState icon="pawprint.fill" title="Ainda não tens pets" description="..." actionLabel="Adicionar pet" onAction=... />` |
| Populated    | Query returns 1+ rows                      | `<FlatList>` of rows + footer hint text                                                                                      |
| Refreshing   | Pull-to-refresh active                     | Native `RefreshControl` spinner at top, list still visible                                                                   |
| Action sheet | Long-press triggered                       | Scrim + bottom sheet slides up; list dimmed underneath                                                                       |
| Error        | Query throws (DB corruption, etc.)         | Inline `<Text>` "Não foi possível carregar os teus pets." + retry `<Pressable>`. MVP-acceptable; no toast library yet.       |

## Accessibility

- Pet row: `accessibilityRole="button"`, `accessibilityLabel={\`${name}, ${species}, ${age}\`}`, `accessibilityHint="Toca para abrir detalhes, mantém pressionado para opções"`.
- Header `+` button: `accessibilityLabel="Adicionar pet"`, minimum 48×48 hit area.
- Empty state CTA: `accessibilityLabel="Adicionar primeiro pet"`.
- Bottom sheet: `BottomSheetModal` from `@gorhom/bottom-sheet` v5 manages focus and provides screen-reader support. Each sheet action is a `Pressable` with `accessibilityRole="button"` and a label that interpolates the pet name: "Editar Rex", "Apagar Rex".
- Heading hierarchy: header title is the page H1 logically; use `accessibilityRole="header"` on the title `<Text>`.
- The "Toca para abrir · mantém para opções" footer hint is decorative — wrap in `<View accessible={false}>` to avoid screen-reader clutter.

## Out of scope

- Search, filter, sort.
- Multi-select / bulk operations.
- Drag-to-reorder.
- Sharing pets with other tutors.
- Showing the pet's photo in the list — the list always uses initial-based `Avatar` for visual consistency; the photo (when set) is shown in Pet Detail.
- "Recent" or "Favourites" sections.
- Animations on row insertion/removal (default `FlatList` behaviour is fine for MVP).

## Implementation checklist

```markdown
- [ ] `/db-migration "create pets table"` — produces `lib/migrations/0001-create-pets-table.ts` with the SQL above (importing `SPECIES` from the constant below) and updates `lib/db-types.ts` with the `Pet` type
- [ ] Create `lib/constants/species.ts` exporting the 15-item `SPECIES` const (copy from `docs/specs/00-overview.md`)
- [ ] `npx expo install @gorhom/bottom-sheet`
- [ ] Wrap `app/_layout.tsx` root: `<GestureHandlerRootView style={{ flex: 1 }}>` as the outermost wrapper; `<BottomSheetModalProvider>` inside the `SQLiteProvider`, around the `ThemeProvider`
- [ ] Add icon `MAPPING` entries to `components/ui/icon-symbol.tsx`: `plus.circle.fill → add-circle`, `plus → add`, `pawprint.fill → pets`, `square.and.pencil → edit`, `trash → delete`
- [ ] `/new-themed-component Avatar Pressable` — then extend the generated file to accept `name` and `size` props and derive colour by hashing `name`
- [ ] `/new-themed-component EmptyState View` — then extend to accept `icon`, `title`, `description`, `actionLabel`, `onAction` props
- [ ] Create `components/pet-actions-sheet.tsx` manually (wraps `BottomSheetModal`; the `/new-themed-component` skill is not a good fit here)
- [ ] Replace the entirety of `app/(tabs)/index.tsx` with the screen described above (`<FlatList>`, `<Avatar>`, `<EmptyState>`, `<PetActionsSheet ref>`)
- [ ] Validate: `npm run lint`, `npm run typecheck`. Restart Metro (`npm start`) so `require.context` picks up the new migration. Open the app on web and at least one native target. Exercise: empty state CTA → opens Pet Form, populated state long-press → sheet, sheet delete → Alert → row removed.
- [ ] Do NOT commit until the user reviews the running app against this spec.
```

When implementing, treat this spec as the contract. If implementation surfaces a non-trivial gap not covered here, stop, update the spec via a new commit, then resume code work.
