# Pet Form — visual design

| Field      | Value                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status     | Approved · Pending implementation                                                                                                                                                                                     |
| Scope      | Visual treatment of `app/pet-form.tsx` (new) and two new components: `components/photo-upload-circle.tsx`, `components/species-picker-sheet.tsx`. Also one icon-mapping addition.                                     |
| Supersedes | The wireframes in [`docs/specs/02-pet-form.md`](../../specs/02-pet-form.md) (which were drafted pre-shadcn). Functional contract (routing, validation, queries, accessibility, out-of-scope) of spec 02 is unchanged. |
| Builds on  | [`docs/superpowers/specs/2026-05-12-pets-list-shadcn-redesign.md`](./2026-05-12-pets-list-shadcn-redesign.md) — the canonical visual language. Tokens, type ramp, icon system, press states are inherited as-is.      |

## Purpose

Translate Pet Form into the shadcn visual language established in the Pets List redesign. Pet Form introduces primitives that didn't exist on screen 01 — text inputs, a photo-upload widget, a species selector, a modal-screen header — and this spec defines each of them at a level the implementation plan can consume directly.

## Reference language (inherited)

All of the following come from the Pets List shadcn redesign and are reused unchanged:

- Token palette (`Theme.light` / `Theme.dark`) including `background`, `card`, `muted`, `mutedForeground`, `border`, `primary`, `primaryForeground`, `accent`, `destructive`, `destructiveSurface`, `destructiveBorder`.
- Typography (`FontFamilies.sans.*`, `FontFamilies.mono.*`) and the type ramp (`title`, `subtitle`, `body`, `meta`, `label-mono`, etc.).
- `IconSymbol` component backed by `lucide-react-native`, with the existing MAPPING.
- Press / pressed micro-interactions: opacity 0.92 + scale 0.98 for primary, `bg: accent` for ghost/list/sheet rows.
- The bottom-sheet chrome from `PetActionsSheet` — custom drag handle (36×4 `muted`, `rounded-full`, padded container), `bg: card`, top corners `rounded-16`, scrim 40 % + `pressBehavior: "close"`.

## Icon additions

Add to `MAPPING` in `components/ui/icon-symbol.tsx`. Lucide names provided.

| Key (consumer-facing) | Lucide                                                                    | Used on                                                                |
| --------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `chevron.down`        | `ChevronDown`                                                             | Species selector dropdown affordance                                   |
| `checkmark`           | `Check`                                                                   | Selected species row in the picker sheet                               |
| `photo.fill`          | `ImageIcon` (imported as `ImageIcon` to avoid clashing with RN's `Image`) | Reserved for future detail screen — register but optional on this form |
| `camera.fill`         | `Camera`                                                                  | Camera badge on the photo upload circle                                |

`photo.fill → ImageIcon` is included for future use (Pet Detail will likely show a placeholder when no photo); register it now so it's not a one-off later.

## New visual primitives

### Input field (`Input`)

Used three times on this screen (`Nome`, `Espécie` dropdown surrogate, `Data nasc.`). Should become a reusable primitive at `components/form/input.tsx` so it's available for spec 04 (Vaccine Form) without redefinition.

```text
NOME                                                ← label-mono ramp, mutedForeground
┌──────────────────────────────────────────────┐
│ Rex                                          │   ← Geist 14 regular, foreground
└──────────────────────────────────────────────┘   ← 1px theme.border, rounded-md 8
                                                   ← height 40, padding 0/12
```

Visual contract:

- Label: `FontFamilies.mono.medium`, 10 px, `letterSpacing: 0.8`, `textTransform: 'uppercase'`, color `mutedForeground`. Margin-bottom 6.
- Container: `bg: card`, `border: 1px theme.border`, `borderRadius: 8`, `height: 40`, `paddingHorizontal: 12`. Has the text input as child, plus optional trailing slot (chevron, clear button — only used in the picker surrogate; on bare inputs there's nothing trailing).
- Text input: `fontFamily: FontFamilies.sans.regular`, `fontSize: 14`, `color: theme.foreground`, `placeholderTextColor: theme.mutedForeground`, `selectionColor: theme.foreground`. No padding (parent provides it).
- Focused state: `borderColor` transitions to `theme.foreground`, `borderWidth: 1.5` (this is the equivalent of shadcn's "ring" — we don't need a separate outset because the border-width change reads as emphasis without re-flowing layout if we keep `borderWidth` consistent and instead bump opacity… actually a 0.5 px bump is fine because the container `height: 40` includes 1 px border each side and the input has slack). Use `onFocus`/`onBlur` to flip a local state.
- Error state: `borderColor: theme.destructive`. Helper text (see Helper below) appears below in `destructive`.
- Disabled state: `opacity: 0.6` on the whole container; `pointerEvents: 'none'`. Used during submission.

**Helper text slot** (below the input, optional): `FontFamilies.sans.regular`, 12 px, `lineHeight: 16`, `marginTop: 6`. Color is `mutedForeground` for neutral helpers (e.g. "Opcional") and `destructive` for error messages.

**API sketch** (the implementation plan will refine):

```tsx
type InputProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  trailing?: React.ReactNode; // chevron for the picker surrogate
  onPress?: () => void; // when set, the input becomes a Pressable instead of TextInput (used for the species picker)
  accessibilityLabel?: string;
  accessibilityValue?: { text: string };
  // ...plus pass-through TextInput props (keyboardType, autoCapitalize, maxLength, returnKeyType)
};
```

When `onPress` is provided, the component renders a `Pressable` styled identically to the input, with the current value as `Text` (or the placeholder if empty). This is how the **Species** field looks like an input but acts like a dropdown that opens the bottom sheet.

### `PhotoUploadCircle`

Circular widget for the pet photo. Empty state shows a dashed-border placeholder with the paw print at the centre; filled state shows the chosen image. Both states have a small primary-tinted camera badge in the bottom-right corner.

```text
        ⌒⌒⌒⌒⌒                  ← dashed border, theme.border
       ⌒       ⌒
      ⌒    🐾   ⌒                ← pawprint.fill 32 px, mutedForeground
       ⌒       ⌒
        ⌒⌒⌒⌒⌒
              ┌──┐
              │📷│                ← camera badge (28×28, bg-primary, rounded-full)
              └──┘                  with Camera icon 14 px in primaryForeground
```

Visual contract:

- Container: 88 × 88 px, `borderRadius: 999`. Empty: `borderWidth: 1.5`, `borderColor: theme.border`, `borderStyle: 'dashed'`. Filled: no border; `<Image>` fills the circle with `resizeMode: 'cover'`.
- Empty content: `IconSymbol name="pawprint.fill"` size 32, color `theme.mutedForeground`, centred via `alignItems`/`justifyContent`.
- Camera badge: positioned `bottom: -2`, `right: -2` relative to the circle (slight overhang). Size 28 × 28, `borderRadius: 999`, `bg: theme.primary`, `borderWidth: 2`, `borderColor: theme.background` (so it cuts cleanly from the dashed circle / image edge). Contains `IconSymbol name="camera.fill"` size 14, color `theme.primaryForeground`, `strokeWidth` mapped from `weight="semibold"`.
- Pressable area covers the whole 88 × 88 circle (and the badge overhang). On press: `opacity: 0.85` for the whole composite.
- A small caption sits under the circle: "Toque para escolher foto" (empty) / "Toque para alterar foto" (filled). `FontFamilies.sans.regular`, 12 px, `mutedForeground`, `textAlign: 'center'`, `marginTop: 8`.

**Accessibility:** the outer `Pressable` is `accessibilityRole="button"` with `accessibilityLabel` = `uri ? 'Alterar foto do pet' : 'Adicionar foto do pet'`. The badge has `accessible={false}` (decorative — its press is absorbed by the parent). Long-press triggers the remove-photo flow (see `Alert.alert("Remover foto?", …)` in the functional spec).

### `SpeciesPickerSheet`

Bottom sheet listing the 15 species from `lib/constants/species.ts`. Inherits the chrome from `PetActionsSheet` (drag handle, card bg, rounded-16 top).

```text
                  ────                              ← drag handle 36×4, theme.border, rounded-full
ESPÉCIE                                             ← title in label-mono ramp, padding 0/20 8
─────────────────────────────────────────           ← 1px hairline, theme.border
  Cão                                       ✓       ← row 48 px, theme.primary check 18px right
─────────────────────────────────────────
  Gato
─────────────────────────────────────────
  Coelho
…  (scrollable inside the sheet)
```

Visual contract:

- Sheet background: `theme.card`, top corners `rounded-16` (16 px), drop shadow at the top edge `0 -8px 30px -8px rgba(9,9,11,0.18)` (same as PetActionsSheet).
- Drag handle: identical to PetActionsSheet (36 × 4, `theme.border`, `rounded-full`, container `paddingTop: 8`, `paddingBottom: 4`).
- Title row: padding `0/20 8/20`, contains a single `<Text>` "ESPÉCIE" in the `label-mono` ramp (`FontFamilies.mono.medium`, 10 px, letter-spacing 0.8, uppercase, color `mutedForeground`).
- Separator: 1 px (`StyleSheet.hairlineWidth`) `theme.border` below the title.
- List rows (rendered via `BottomSheetFlatList` for momentum + virtualization):
  - Row: `minHeight: 48`, `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, padding `12/20`, 1 px bottom border `theme.border` (last row no bottom border).
  - Label: `FontFamilies.sans.medium`, 14 px, color `theme.foreground`, `numberOfLines: 1`.
  - Trailing: when the row is selected, `IconSymbol name="checkmark"` size 18, color `theme.primary`. When not selected: empty (no chevron — selection is the only state worth indicating).
  - Pressed: `bg: theme.accent`.
- Sheet sizing: `enableDynamicSizing` — height adapts to content but caps at ~70 % of screen so the user sees the form behind dimming on tall phones. (`@gorhom/bottom-sheet` v5 caps automatically at the snap-point ceiling we configure; if we want a hard cap, pass `snapPoints={['60%']}` and switch off dynamic sizing.)
- Scrim: `BottomSheetBackdrop` `opacity={0.4}` with `pressBehavior="close"` (same as PetActionsSheet).

**API:**

```tsx
type SpeciesPickerSheetRef = {
  present: () => void; // no arg — the current value is read from the controlled prop
  dismiss: () => void;
};

type SpeciesPickerSheetProps = {
  value: Species | null;
  onChange: (next: Species) => void;
};
```

Selecting a row calls `onChange(next)` then `dismiss()` synchronously. Dismissing via scrim or pan-down leaves the value untouched (just calls the parent's `onDismiss` if provided — but we don't need that complexity for this MVP).

### Modal-screen header (`PetFormHeader`)

Replaces the default `Stack` navigation chrome. We render our own `<View>` header inside `pet-form.tsx` and set the Stack screen options to `headerShown: false` for this route.

```text
┌─────────────────────────────────────────────────────────┐
│  Cancelar              Novo pet                   Salvar│
└─────────────────────────────────────────────────────────┘
                                                          ← 1px theme.border bottom
```

Visual contract:

- Container: `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `paddingHorizontal: 20`, `paddingVertical: 14`, `borderBottomWidth: StyleSheet.hairlineWidth`, `borderBottomColor: theme.border`, `backgroundColor: theme.background`.
- Left — Cancelar button: a `Pressable` with `accessibilityRole="button"`, `accessibilityLabel="Cancelar"`. Visual: just text. `FontFamilies.sans.medium`, 14 px, color `theme.foreground`. Pressed state: `opacity: 0.6` (no background). Hit-slop expands to 48 × 48.
- Centre — title: a `<Text>` absolutely centred or positioned via flex `flex: 1` with `textAlign: 'center'`. `FontFamilies.sans.semibold`, 16 px, `letterSpacing: -0.2`, color `theme.foreground`, `numberOfLines: 1`. Text is "Novo pet" (create mode), "Editar Rex" (edit mode, name interpolated when loaded, "Editar pet" before load).
- Right — Salvar button: a small variant of the primary CTA from Pets List. Visual: `bg: theme.primary`, color `theme.primaryForeground`, `borderRadius: 8`, `height: 32`, `paddingHorizontal: 12`, label "Salvar" or "Salvar alterações" or "Salvando…". Pressed: `opacity: 0.92`, `scale: 0.98`. Disabled: `bg: theme.muted`, color `theme.mutedForeground`, no scale on press, no haptic, `accessibilityState.disabled: true`.
- During submission: button content swaps to a small `ActivityIndicator` (size "small", color `primaryForeground`) plus the text "Salvando…". The button itself stays in the primary fill (not muted) so the user has a clear "in flight" signal.

### Form layout

```text
┌────────────────────────────────────────────────┐
│                                                │   ← header (PetFormHeader)
├────────────────────────────────────────────────┤
│                                                │
│              [ photo upload ]                  │   ← centred, padding-top 24
│           Toque para escolher foto             │
│                                                │
│  NOME                                          │
│  ┌──────────────────────────────────────────┐  │
│  │ ex.: Rex                                 │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ESPÉCIE                                       │
│  ┌──────────────────────────────────────────┐  │
│  │ Selecione a espécie                  ▾   │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  DATA DE NASCIMENTO                            │
│  ┌──────────────────────────────────────────┐  │
│  │ dd/mm/aaaa                               │  │
│  └──────────────────────────────────────────┘  │
│  Opcional                                      │
│                                                │
└────────────────────────────────────────────────┘
```

- Outer: `KeyboardAvoidingView` (behavior `'padding'` on iOS, `'height'` on Android) wrapping a `ScrollView` with `contentContainerStyle` providing the layout below. The `keyboardShouldPersistTaps: 'handled'` prop lets the user tap outside fields to dismiss the keyboard without losing the species picker tap.
- `ScrollView` padding: `paddingHorizontal: 20`, `paddingTop: 24`, `paddingBottom: 32`. Inside, vertical gap between sections via `marginTop` on each block (we don't use `gap` on ScrollView contents because it can fight with KeyboardAvoidingView padding in some Android versions).
- Photo upload section: centred (`alignItems: 'center'`). Gap below = 24 (i.e. the first input has `marginTop: 24`).
- Each field group: label + input + optional helper/error. Vertical rhythm: label → input gap = 6, input → helper gap = 6, group → next-group gap = 18.

### Save button bottom-pinned variant (alternative — NOT used here)

For completeness so spec 04 (Vaccine Form) can reuse the rule: Pet Form uses **only** the header `Salvar` button — there is **no second pinned-bottom Save button**. The wireframes in the functional spec showed a bottom button "[ Salvar ]" — that's superseded. One save action, one place. Less visual noise, less confusion about which button submits.

## Per-state visuals

### Create — empty

- Photo: empty circle (dashed border, paw print, primary badge), caption "Toque para escolher foto".
- Name input: placeholder "ex.: Rex" in `mutedForeground`.
- Species surrogate: placeholder "Selecione a espécie" in `mutedForeground`, chevron-down 16 px `mutedForeground` in the trailing slot.
- Birth-date: placeholder "dd/mm/aaaa" in `mutedForeground`. Helper text below: "Opcional" in `mutedForeground`.
- Header right: `Salvar` disabled (muted bg + muted-foreground text).

### Create — partial

- Same as above but as the user types `name` or selects `species`, those fields show the typed/selected value in `theme.foreground`.
- Header right: `Salvar` enabled (primary bg) the instant **both** `name` (trimmed, non-empty) and `species` (set) are valid.

### Edit — loading

- Skeleton rendering identical to "edit loaded" but each input value is replaced by a 60 % opacity muted block 16 × 80–140 px (varying width) inside the input container — like our list skeleton but inside the input shells. No shimmer animation (the load is fast; constant muted blocks read as "loading" without distracting).
- Photo: empty circle treatment (we don't know if there's a photo until the SELECT resolves; showing the placeholder is the honest default).
- Header right: `Salvar` disabled. Header centre title: "Editar pet" (we don't have the name yet).

### Edit — loaded

- Form populated with the fetched values.
- Header right: `Salvar` enabled (treat all loaded fields as valid; user can edit and re-validate inline).
- Header centre: "Editar {name}" (e.g. "Editar Rex"), truncated to one line with ellipsis if the name is unreasonably long.

### Submitting

- All inputs `pointerEvents: 'none'`, opacity 0.6 (matches the input disabled treatment).
- Header right: `Salvar` shows the inline `ActivityIndicator` + "Salvando…".
- Cancelar stays enabled? **No.** During the in-flight write, also disable Cancel (`opacity: 0.6`, `pointerEvents: 'none'`). The DB write should be < 50 ms locally; if the user could cancel mid-write we'd need rollback logic that's not worth it for this MVP.

### Invalid (after Save tapped)

- The first invalid field's input gets `borderColor: theme.destructive`.
- Helper text under that input swaps to the validation message in `theme.destructive`. Validation messages:
  - Name empty: "Informe o nome do pet."
  - Name too long: "Nome muito longo (máximo 100 caracteres)."
  - Birth date format: "Formato inválido. Use dd/mm/aaaa."
  - Birth date in future: "A data não pode ser no futuro."
- Save tap on invalid only: shake / red-ring? **No** — the error is enough. Stay quiet.

### Picker open

- Form behind the sheet is dimmed by the `BottomSheetBackdrop` scrim (40 %). No additional treatment.

### Permission denied

- Visual is purely the native `Alert.alert("Permissão necessária", "Ative o acesso a fotos nas configurações para escolher uma imagem.")`. No on-form visual change — the photo state stays as it was.

## Strings (PT-BR — unchanged from functional spec where they overlap; additions where the new visuals introduce text)

| Slot                                                   | Copy                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| Modal title — create                                   | `Novo pet`                                                           |
| Modal title — edit (before load)                       | `Editar pet`                                                         |
| Modal title — edit (loaded)                            | `Editar {name}` (e.g. `Editar Rex`)                                  |
| Cancel button                                          | `Cancelar`                                                           |
| Save button — create                                   | `Salvar`                                                             |
| Save button — edit                                     | `Salvar alterações`                                                  |
| Save button — submitting                               | `Salvando…`                                                          |
| Photo caption — empty                                  | `Toque para escolher foto`                                           |
| Photo caption — filled                                 | `Toque para alterar foto`                                            |
| Photo remove confirm — title                           | `Remover foto?`                                                      |
| Photo remove confirm — body                            | `A foto será removida deste pet.`                                    |
| Photo remove confirm — buttons                         | `Cancelar` / `Remover`                                               |
| Name label                                             | `NOME`                                                               |
| Name placeholder                                       | `ex.: Rex`                                                           |
| Species label                                          | `ESPÉCIE`                                                            |
| Species placeholder                                    | `Selecione a espécie`                                                |
| Species picker title                                   | `ESPÉCIE`                                                            |
| Birth-date label                                       | `DATA DE NASCIMENTO`                                                 |
| Birth-date placeholder                                 | `dd/mm/aaaa`                                                         |
| Birth-date helper (neutral)                            | `Opcional`                                                           |
| Validation — name required                             | `Informe o nome do pet.`                                             |
| Validation — name too long                             | `Nome muito longo (máximo 100 caracteres).`                          |
| Validation — date format                               | `Formato inválido. Use dd/mm/aaaa.`                                  |
| Validation — date in future                            | `A data não pode ser no futuro.`                                     |
| Permission denied — title                              | `Permissão necessária`                                               |
| Permission denied — body                               | `Ative o acesso a fotos nas configurações para escolher uma imagem.` |
| Pet-not-found (deleted while form was opening) — title | `Pet não encontrado`                                                 |
| Pet-not-found — body                                   | `Este pet foi removido. A tela vai fechar.`                          |

## Out of scope (carried from functional spec, plus visual exclusions)

- Native `DateTimePicker` — birth date is a plain `TextInput` for MVP.
- Auto-formatting mask on the date input as user types — plain text, validate on blur and submit.
- Photo crop / rotate beyond `expo-image-picker`'s `allowsEditing: true` native cropper.
- Dirty-form confirmation when tapping Cancel.
- Animated transitions between create/edit modes (none; mode is set on mount).
- Custom keyboard accessory above the keyboard (no "Next / Done" toolbar — rely on `returnKeyType="next"` / `"done"` on the inputs).
- Optimistic UI / undo for submit — local DB write is fast and atomic; we just wait.

## Done when

- `components/form/input.tsx` exports the `Input` primitive matching this spec, with focus / error / disabled states behaving correctly.
- `components/photo-upload-circle.tsx` exports `PhotoUploadCircle`, including the primary-fill camera badge and the long-press remove flow.
- `components/species-picker-sheet.tsx` exports `SpeciesPickerSheet` (forwardRef API), inheriting the bottom-sheet chrome from `PetActionsSheet`.
- `app/pet-form.tsx` renders the form with the layout above; create + edit + loading + submitting + invalid states all visible.
- `app/_layout.tsx` Stack registers `pet-form` with `presentation: 'modal'` and `headerShown: false`.
- `components/ui/icon-symbol.tsx` MAPPING includes the four new keys above, mapped to the listed lucide icons.
- `npm run lint && npm run typecheck && npm run format:check` all green.
- All strings PT-BR per the table above.
- Both light and dark mode render correctly across all states.
- Functional behaviour described in [`docs/specs/02-pet-form.md`](../../specs/02-pet-form.md) (routing, validation rules, queries, accessibility, out-of-scope) is preserved.
