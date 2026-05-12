# 02 — Pet Form

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Status         | Approved (mockup) · Pending implementation                             |
| Route          | `app/pet-form.tsx` (modal stack, registered in `app/_layout.tsx`)      |
| Depends on     | `01-pets-list` (requires `pets` table + `SPECIES` constant + `Avatar`) |
| Tables touched | `pets` (`INSERT` for create, `UPDATE` for edit; `SELECT` for prefill)  |

## Purpose

Modal screen for creating a new pet or editing an existing one. Mode is determined by the presence of an `id` route param (no `id` → create, with `id` → edit). Captures the pet's name, species, optional birth date, and optional photo. Photo upload routes through `expo-image-picker`'s native chooser (handles camera vs library on both platforms). Species selection opens a bottom-sheet picker listing the 15 hardcoded species. Submitting validates the form, persists to `pets`, and dismisses back to the caller (Pets List or Pet Detail).

## Wireframe

Create mode (empty fields, save disabled):

```text
+--------------------------+
| Cancelar  Novo pet Salvar|  ← Salvar in muted/disabled
+--------------------------+
|                          |
|        ⊙ (paw)           |  ← dashed circle, paw icon, camera badge
|     ╰──[📷]              |
|  Toque para escolher foto|
|                          |
|  NOME                    |
|  [ ex.: Rex           ]  |  ← placeholder grey
|                          |
|  ESPÉCIE                 |
|  [ Selecione a espécie▾] |  ← placeholder grey
|                          |
|  DATA NASC. (opcional)   |
|  [ dd/mm/aaaa         ]  |
|                          |
|                          |
|       [ Salvar ]         |  ← disabled (grey)
+--------------------------+
```

Edit mode (pre-filled, save active):

```text
+--------------------------+
|Cancelar Editar pet Salvar|
+--------------------------+
|                          |
|        ⊕ (photo)         |  ← actual image, camera badge to change
|     ╰──[📷]              |
|  Toque para alterar foto |
|                          |
|  NOME                    |
|  [ Rex                ]  |
|                          |
|  ESPÉCIE                 |
|  [ Cão                ▾] |
|                          |
|  DATA NASC. (opcional)   |
|  [ 15/03/2020         ]  |
|                          |
|  [ Salvar alterações  ]  |  ← active primary
+--------------------------+
```

Species picker (bottom sheet over the form):

```text
[form behind, dimmed to ~50%]
+--------------------------+
|         ───              |  ← drag handle
|        Espécie           |  ← sheet title
+--------------------------+
|  Cão              ✓     |  ← selected (primary tint + check)
|  Gato                    |
|  Coelho                  |
|  Hamster                 |
|  ... (scrollable)        |
+--------------------------+
```

Tap a species → set form value, dismiss sheet. Tap on scrim or swipe-down also dismisses (without changing value).

## Components

### Existing primitives reused

- `<View>`, `<Pressable>`, `<TextInput>`, `<ScrollView>` from `react-native`, styled with Tailwind.
- `<IconSymbol>` for the camera badge, dropdown chevron, and species checkmark.
- `@gorhom/bottom-sheet`'s `<BottomSheetModal>` (already installed in spec 01).
- `expo-image-picker` (already in `package.json`) for the photo flow.
- `Alert.alert` for permission-denied feedback if user rejects camera/photo permissions.

### New components to create

- **`PhotoUploadCircle`** (`components/photo-upload-circle.tsx`) — circular photo upload widget. Props: `uri: string | null`, `onChange: (uri: string | null) => void`, `size?: number`. When `uri` is null: renders dashed border circle with `pawprint.fill` icon. When `uri` is set: renders `<Image source={{ uri }}>` filling the circle. Always renders the camera badge bottom-right. Tap calls `ImagePicker.launchImageLibraryAsync` (or a small action sheet offering "Câmera / Galeria / Remover foto"). Handles permission requests.
- **`SpeciesPickerSheet`** (`components/species-picker-sheet.tsx`) — bottom sheet wrapping `<BottomSheetModal>`. Props: `value: Species | null`, `onChange: (value: Species) => void`. Imperative API via `forwardRef`: `present()`, `dismiss()`. Renders title "Espécie" + scrollable list (`<BottomSheetFlatList>`) of `SPECIES`. Selected item shows `checkmark` icon in primary tint.

### Icon mapping entries to add to `components/ui/icon-symbol.tsx`

| SF Symbol (iOS) | Material Symbol fallback (Android/web)                                  |
| --------------- | ----------------------------------------------------------------------- |
| `chevron.down`  | `expand-more`                                                           |
| `checkmark`     | `check`                                                                 |
| `photo.fill`    | `image`                                                                 |
| `camera.fill`   | (already implied; verify `photo_camera` mapping from spec 01 was added) |

If `photo_camera` from spec 01's checklist hasn't been added yet, add it here.

### New theme tokens needed

None. Existing seed tokens suffice.

## Data

### Queries

Only when opened in edit mode (`id` param present):

```sql
SELECT id, name, species, birth_date, photo_uri
FROM pets
WHERE id = ?;
```

Result populates form state on mount. If no row returned (e.g. pet was deleted between long-press and form open), show an error toast and dismiss.

### Mutations

Create mode (submit):

```sql
INSERT INTO pets (name, species, birth_date, photo_uri)
VALUES (?, ?, ?, ?);
```

Edit mode (submit):

```sql
UPDATE pets
SET name = ?, species = ?, birth_date = ?, photo_uri = ?
WHERE id = ?;
```

All values parameterised. `birth_date` and `photo_uri` may be `null`. `created_at` is set by `DEFAULT CURRENT_TIMESTAMP` and never mutated.

### Migrations required

None new. Migration `0001-create-pets-table` already exists from spec 01's session.

### Validation (client-side, before submit)

| Field        | Rule                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `name`       | Trim → must be non-empty, ≤ 100 chars.                                                                                                    |
| `species`    | Must be one of `SPECIES`. (Picker enforces this — TS type is `(typeof SPECIES)[number]`.)                                                 |
| `birth_date` | Optional. If provided: matches `/^\d{4}-\d{2}-\d{2}$/`, parses to a valid `Date`, and is ≤ today (no future dates). Stored as ISO string. |
| `photo_uri`  | Optional. Local URI from `expo-image-picker`. No validation beyond presence.                                                              |

Save button stays disabled until `name` and `species` are both valid. Other errors surface inline below the offending field on submit.

## Interactions

| Trigger                               | Action                                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tap "Cancelar" (header left)          | `router.back()` immediately. (MVP: no dirty-form confirmation.)                                                                                                                                  |
| Tap "Salvar" / "Salvar alterações"    | Run validation. If invalid, show first error inline. If valid, run `INSERT`/`UPDATE`, then `router.back()`.                                                                                      |
| Tap photo circle                      | Call `ImagePicker.requestMediaLibraryPermissionsAsync()`, then `launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true })`. Set `photo_uri` from result. |
| Tap camera badge (alternative source) | Same as photo circle tap — the picker's native UI offers camera/library choice; we don't need a separate sheet.                                                                                  |
| Long-press photo circle               | Show `Alert.alert("Remover foto?", ...)` → on confirm, set `photo_uri` to `null`. (MVP-acceptable; future iteration may use an action sheet.)                                                    |
| Tap species dropdown                  | Call `speciesSheetRef.current?.present()`.                                                                                                                                                       |
| Tap species in sheet                  | Set form `species` to the tapped value, dismiss sheet automatically.                                                                                                                             |
| Tap scrim / swipe sheet down          | Dismiss without changing value (`@gorhom/bottom-sheet` built-in).                                                                                                                                |
| Tap date input                        | MVP: focus the text input; user types `dd/mm/aaaa`. Stored as ISO `aaaa-mm-dd`. Validation on blur and submit. (Future iteration: native `DateTimePicker`.)                                      |
| TextInput focus                       | Apply `border-primary` ring; muted placeholder swaps to `text-foreground` as user types.                                                                                                         |

## States

| State             | When                                        | UI                                                                                                                            |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Create — empty    | Mounted without `id` param                  | All fields empty, placeholders shown, Salvar disabled.                                                                        |
| Create — partial  | User started typing                         | Salvar enabled when `name` non-empty AND `species` set; otherwise disabled.                                                   |
| Edit — loading    | Mounted with `id`, before `SELECT` resolves | Whole form shows a skeleton (3 input shells with shimmer-less muted bg). Header shows title and "Cancelar" but no Salvar.     |
| Edit — loaded     | `SELECT` resolved                           | Form populated with fetched values. Salvar enabled (treat as "always saveable in edit mode" — UX standard).                   |
| Submitting        | Salvar tapped, awaiting DB write            | Salvar button shows spinner + label "Salvando..."; entire form disabled (`pointerEvents: 'none'`).                            |
| Invalid           | Salvar tapped with validation error         | Salvar button does not run write; first invalid field shows inline error in `text-destructive` below the input.               |
| Picker open       | `speciesSheetRef.present()` called          | Scrim over form, bottom sheet visible with species list.                                                                      |
| Permission denied | User rejects camera/library permission      | `Alert.alert("Permissão necessária", "Ative o acesso a fotos nas configurações para escolher uma imagem.")`. Photo unchanged. |

## Accessibility

- Each `TextInput` has a paired visible `<Text>` label above it; pass the same text via `accessibilityLabel`.
- Species dropdown `<Pressable>` has `accessibilityRole="combobox"`, `accessibilityLabel="Espécie"`, `accessibilityValue={{ text: species ?? 'Não selecionada' }}`.
- Photo circle `<Pressable>`: `accessibilityRole="button"`, `accessibilityLabel={uri ? 'Alterar foto do pet' : 'Adicionar foto do pet'}`.
- Camera badge is decorative; absorb its tap into the photo circle's hit area. Don't expose as separate accessibility node.
- Salvar button: `accessibilityLabel` matches its visible text (`Salvar` or `Salvar alterações`); `accessibilityState={{ disabled }}` reflects current validity.
- Cancel button: `accessibilityLabel="Cancelar"`. Minimum 48×48 hit area.
- Bottom sheet: `<BottomSheetFlatList>` handles screen-reader announcements. Each species row is `accessibilityRole="button"`, `accessibilityState={{ selected }}`.
- Form fields ordered top-to-bottom for screen-reader navigation; submit reachable via keyboard "next/done" buttons.

## Out of scope

- Dirty-form confirmation on Cancel (acceptable MVP loss).
- Photo crop / rotate beyond `allowsEditing: true`'s native cropper.
- Multiple photos per pet (gallery).
- Custom species not in `SPECIES` (use `Outro` as escape hatch).
- Server-side validation (single-user local DB — client validation is the whole story).
- Birth date as a native `DateTimePicker` (free-text input for MVP; native picker is a future polish).
- Field-level "saved" indicators or autosave.
- Soft delete / archive (no undo for delete; spec 01 handles delete via Alert).

## Implementation checklist

```markdown
- [ ] Register the route in `app/_layout.tsx` Stack: `<Stack.Screen name="pet-form" options={{ presentation: 'modal', title: 'Pet' }} />`
- [ ] Verify icons from spec 01 are in MAPPING (`photo_camera`, `pets`); add new icons: `chevron.down → expand-more`, `checkmark → check`, `photo.fill → image`
- [ ] Confirm `lib/constants/species.ts` exists from spec 01; if not, create it now
- [ ] Confirm `expo-image-picker` is configured in `app.json` plugins: `["expo-image-picker", { "photosPermission": "Permite acesso para escolher uma foto do seu pet.", "cameraPermission": "Permite acesso à câmera para fotografar seu pet." }]`
- [ ] Create `components/photo-upload-circle.tsx` manually (custom, not via `/new-themed-component`)
- [ ] Create `components/species-picker-sheet.tsx` manually (wraps `BottomSheetModal`)
- [ ] Create `app/pet-form.tsx` with the screen described above:
  - Read `id` from `useLocalSearchParams()`
  - If `id`: `useEffect` runs the `SELECT`, populates state
  - Validate on every input change; toggle Save enabled
  - Submit: `INSERT` or `UPDATE`, then `router.back()`
- [ ] Validate: `npm run lint`, `npm run typecheck`. Restart Metro. Smoke test on web + at least one native target: open from Pets List `+`, fill fields, save, see new pet in list. Open from long-press → Editar, modify, save, see updated row.
- [ ] Do NOT commit until the user reviews the running app against this spec.
```

When implementing, treat this spec as the contract. Non-trivial gaps require a spec update before code.
