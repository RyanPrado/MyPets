# MyPets MVP — Overview

MyPets is a personal pet management app for a single household tutor. The MVP covers core CRUD on pets with **vaccination tracking embedded inside the Pet Detail screen** (no separate vaccines list route). Destructive operations use the native `Alert.alert` confirmation; per-row actions use bottom sheets (`@gorhom/bottom-sheet`).

Implementation follows the AI-assisted UI design workflow in [`docs/superpowers/specs/2026-05-12-mockup-workflow-design.md`](../superpowers/specs/2026-05-12-mockup-workflow-design.md). Read this overview first, then drill into the relevant `0N-<screen>.md` for implementation details. Each screen is implemented in a **separate session**, in the order numbered below.

## Screen set (4 screens, in implementation order)

### 01 — Pets List

- **Purpose:** Tab home of the app. Lists all pets the tutor has registered, providing entry points to drill into each pet's detail, add a new pet, or perform per-pet actions via long-press.
- **User:** Tutor (single-user app for MVP).
- **Entities touched:** reads `pets`.
- **Main action:** tap a pet row to open Pet Detail.

### 02 — Pet Form

- **Purpose:** Create or edit a pet. Mode determined by route params (no `id` → create, with `id` → edit). Presented as a modal so the tutor can dismiss without saving. Includes photo upload (camera or library via `expo-image-picker`) and species selection via a bottom-sheet picker (15 hardcoded species).
- **User:** Tutor.
- **Entities touched:** writes `pets` (`INSERT` or `UPDATE`).
- **Main action:** submit form → save → dismiss modal → return to caller.

### 03 — Pet Detail

- **Purpose:** Show all stored info for a single pet (name, species, birth date, photo) plus an embedded **Vacinas** section with summary (count, last date, next due date) and a scrollable list of vaccines. Entry points: edit pet (CTA), delete pet (overflow menu → `Alert.alert`), add/edit vaccine (inline `+ Adicionar` → Vaccine Form modal), per-vaccine actions (long-press → bottom sheet).
- **User:** Tutor.
- **Entities touched:** reads `pets` filtered by id; reads `vaccines` filtered by `pet_id`; writes `pets` on delete (CASCADE removes vaccines).
- **Main action:** read pet info and manage vaccines.

### 04 — Vaccine Form

- **Purpose:** Create or edit a vaccine record for a specific pet. The pet is pre-selected via route param and not editable in the form. Captures: vaccine name (free text), date administered (required), amount paid in EUR (optional), next due date (optional). Presented as a modal.
- **User:** Tutor.
- **Entities touched:** writes `vaccines` (`INSERT` or `UPDATE`).
- **Main action:** submit form → save → dismiss modal → return to Pet Detail.

## Seed theme tokens

Added to `global.css` in the commit that follows this overview. They map approximately 1:1 to the existing `Colors.light` / `Colors.dark` so existing `ThemedText`/`ThemedView` continue to look the same during the transition. Token names follow the shadcn/ui convention.

| Token                            | Purpose                                       |
| -------------------------------- | --------------------------------------------- |
| `--color-background`             | Main page background                          |
| `--color-foreground`             | Primary text                                  |
| `--color-muted-foreground`       | Secondary text, inactive icons                |
| `--color-border`                 | Dividers, card borders, input outlines        |
| `--color-card`                   | Slightly elevated surface (rows, form inputs) |
| `--color-primary`                | Brand accent, primary actions, active states  |
| `--color-primary-foreground`     | Text on primary fills                         |
| `--color-destructive`            | Destructive actions (delete)                  |
| `--color-destructive-foreground` | Text on destructive fills                     |

Dark mode values applied via `@media (prefers-color-scheme: dark)`. NativeWind's `dark:` variant uses the same media query, so writing `bg-background dark:bg-background` is redundant — the bare `bg-background` already swaps based on system preference.

## Cross-cutting preparation (which spec handles what)

These are pieces of infrastructure shared across multiple screens. Each is scheduled inside the Implementation checklist of the spec that **first needs** it.

| Preparation                                                                                                              | First spec      | Notes                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------- |
| Seed tokens in `global.css`                                                                                              | (this commit)   | Done before any screen work begins                                                                 |
| Install `@gorhom/bottom-sheet` + wrap `app/_layout.tsx` with `GestureHandlerRootView` and `BottomSheetModalProvider`     | `01-pets-list`  | Needed for long-press action sheet on rows                                                         |
| Create `lib/constants/species.ts` with the 15-species list                                                               | `01-pets-list`  | Imported by migration `0001` to generate the `CHECK` clause; reused by the picker in `02-pet-form` |
| Migration `0001-create-pets-table` (id, name, species + CHECK, birth_date, photo_uri, created_at)                        | `01-pets-list`  | Required before any pet query can run. `CHECK` clause derived from the SPECIES constant            |
| Migration `0002-create-vaccines-table` (id, pet_id FK CASCADE, name, date_given, amount_paid, next_due_date, created_at) | `03-pet-detail` | Plus enabling `PRAGMA foreign_keys = ON` in the migrations runner                                  |
| Reusable `Avatar` component with initial-based placeholder (light coloured circle + first letter of pet name)            | `01-pets-list`  | Created via `/new-themed-component`                                                                |
| Icon mapping entries added to `components/ui/icon-symbol.tsx`                                                            | each spec       | Each spec lists the icons it introduces                                                            |

## Species list (hardcoded for MVP)

To be created in `lib/constants/species.ts` as part of screen 01's checklist (needed early because migration `0001` derives the SQL `CHECK` clause from this constant):

```ts
export const SPECIES = [
  'Cão',
  'Gato',
  'Coelho',
  'Hamster',
  'Cobaia',
  'Rato',
  'Furão',
  'Periquito',
  'Canário',
  'Papagaio',
  'Tartaruga',
  'Iguana',
  'Cobra',
  'Peixe',
  'Outro',
] as const;
```

Stored as `TEXT` in the `pets.species` column with a SQL `CHECK` constraint enforcing the value is one of the above. The TS type is `(typeof SPECIES)[number]`.

## Out of scope for the MVP

Explicit non-goals to constrain implementing agents:

- Multi-user / authentication. Single-tutor app.
- Sharing pets with other users.
- Search / filter / sort on Pets List (set is small — < 10 items typically).
- Photo capture from camera **vs** library distinction in UI — `expo-image-picker` shows a unified prompt.
- Reminder push notifications for upcoming vaccines (`expo-notifications` is installed but unused in MVP).
- Vaccine name autocomplete from a known catalog. Free-text field for MVP.
- i18n. PT strings inline. (Future concern.)
- Onboarding screen for first-time users — the empty state of Pets List suffices.
- Settings / profile screen.
