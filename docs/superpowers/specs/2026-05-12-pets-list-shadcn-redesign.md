# Pets List — shadcn redesign

| Field      | Value                                                                                                                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Status     | Approved (mockup) · Pending implementation                                                                                                                                                                                                                                                       |
| Scope      | Visual treatment of `app/(tabs)/index.tsx`, `components/empty-state.tsx`, `components/pet-actions-sheet.tsx`, `components/avatar.tsx`. Token + typography updates that the other 3 screens will reuse.                                                                                           |
| Replaces   | The "Soft Medallion" treatment shipped in commit history immediately before this spec.                                                                                                                                                                                                           |
| Supersedes | Two specific sections of [`docs/specs/01-pets-list.md`](../../specs/01-pets-list.md): (a) the icon `MAPPING` block (SF Symbols → MaterialIcons); (b) the `Avatar` "6-tone palette by hash" rule. All other content of spec 01 (routing, queries, accessibility, interaction model) is unchanged. |

## Purpose

Replace the current generic-feeling visual language of the Pets List with a deliberate, dense, monochrome design inspired by **shadcn/ui** (zinc palette, Geist typography, 1px borders, `rounded-md` everywhere). The language must work for all four screens of the MVP — Pets List, Pet Form, Pet Detail, Vaccine Form — so this document is the canonical visual contract; per-screen specs will reference it instead of re-deriving tokens.

## Aesthetic direction

**Reference:** shadcn/ui dashboard examples, Linear, Vercel admin. The aesthetic earns its "modern" through restraint — disciplined hairlines, near-zero ornament, a single primary that's just near-black, and editorial-grade typography via Geist (Vercel's sans).

**Principles:**

- One accent only — `primary` is near-black in light mode, near-white in dark. No brand colour.
- Hairlines (1px solid border) do most of the structural work; shadows are negligible (`shadow-sm` at most).
- Corner radius is `rounded-md` (≈8 px) at component level and `rounded-lg` (≈12 px) at container level. Never `rounded-full` except for status-bar dots and the bottom-sheet drag handle.
- Typography establishes hierarchy — `text-xs`/`text-sm`/`text-base`/`text-2xl` with `tracking-tight` on headings; weight changes (500/600) carry more than size jumps.
- `Geist Mono` is used sparingly for "label" text (uppercase + letter-spacing) to mark meta rows and section breaks. Never for body content.

## Design tokens

These extend (and partially override) the `Theme` semantic constant in `constants/theme.ts` introduced in the previous iteration. Update `Theme` to these exact values, and mirror them in `global.css`. Keep the existing `Colors` and `Fonts` exports untouched — they back the navigation theme and legacy boilerplate.

### Light

| Token                   | Hex       | Source                                                  |
| ----------------------- | --------- | ------------------------------------------------------- |
| `background`            | `#FFFFFF` | shadcn `background`                                     |
| `foreground`            | `#09090B` | shadcn `foreground` (zinc-950)                          |
| `card`                  | `#FFFFFF` | shadcn `card` — same as bg; structure via border        |
| `muted`                 | `#F4F4F5` | shadcn `muted` (zinc-100)                               |
| `mutedForeground`       | `#71717A` | shadcn `muted-foreground` (zinc-500)                    |
| `border`                | `#E4E4E7` | shadcn `border` (zinc-200)                              |
| `primary`               | `#18181B` | shadcn `primary` (zinc-900)                             |
| `primaryForeground`     | `#FAFAFA` | shadcn `primary-foreground` (zinc-50)                   |
| `accent`                | `#F4F4F5` | shadcn `accent` — same as muted; used for hover/pressed |
| `destructive`           | `#DC2626` | shadcn `destructive` (red-600)                          |
| `destructiveForeground` | `#FAFAFA` | shadcn `destructive-foreground`                         |
| `destructiveSurface`    | `#FEF2F2` | red-50 — fill for error medallion                       |
| `destructiveBorder`     | `#FECACA` | red-200 — border for error medallion                    |

### Dark

| Token                   | Hex       | Source                                  |
| ----------------------- | --------- | --------------------------------------- |
| `background`            | `#09090B` | zinc-950                                |
| `foreground`            | `#FAFAFA` | zinc-50                                 |
| `card`                  | `#09090B` | same as bg                              |
| `muted`                 | `#27272A` | zinc-800                                |
| `mutedForeground`       | `#A1A1AA` | zinc-400                                |
| `border`                | `#27272A` | zinc-800                                |
| `primary`               | `#FAFAFA` | zinc-50                                 |
| `primaryForeground`     | `#18181B` | zinc-900                                |
| `accent`                | `#27272A` | same as muted                           |
| `destructive`           | `#EF4444` | red-500 (brighter in dark for contrast) |
| `destructiveForeground` | `#FAFAFA` | zinc-50                                 |
| `destructiveSurface`    | `#450A0A` | red-950                                 |
| `destructiveBorder`     | `#7F1D1D` | red-900                                 |

**Action items in code:**

1. Update `constants/theme.ts` → `Theme` constant to the values above. Add the new keys (`muted`, `accent`, `destructiveSurface`, `destructiveBorder`) for both modes.
2. Mirror the same values in `global.css` (the existing `@theme` block) so NativeWind utilities (where reliable) stay in sync.

## Typography

**Primary face:** Geist (Vercel sans). Variable weights 400–700 used.

**Mono face:** Geist Mono. Used only for meta labels (`list-meta`, `section-label`, status bar time, dataset counts).

**Loading strategy:**

- Web (static export): `@import` Google Fonts in `global.css`:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
  ```
- Native (iOS/Android): use the `@expo-google-fonts/geist` family (`@expo-google-fonts/geist` for the sans, `@expo-google-fonts/geist-mono` for the mono — confirm exact package names in the implementation plan). Load in `app/_layout.tsx` via `useFonts` before rendering the Stack; show a blank SplashScreen until loaded so the typography never flashes.

**Fallback chain:**

```ts
fontFamily: Platform.select({
  ios: "'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif",
  android: "'Geist', sans-serif",
  default: "'Geist', ui-sans-serif, system-ui, sans-serif",
});
```

**Type ramp:**

| Token          | Size · Line · Weight · Tracking | Usage                                             |
| -------------- | ------------------------------- | ------------------------------------------------- |
| `title`        | 26 · 30 · 600 · -0.7 px         | Screen title (`Meus pets`)                        |
| `subtitle`     | 17 · 22 · 600 · -0.3 px         | Empty-state title; section heads on other screens |
| `body`         | 14 · 20 · 500 · -0.1 px         | Pet name, action labels, button labels            |
| `body-regular` | 14 · 20 · 400                   | Card body text (used on Detail later)             |
| `meta`         | 12 · 18 · 400                   | "Cão · 6 anos" beneath name                       |
| `caption`      | 11 · 16 · 500                   | Tab labels                                        |
| `label-mono`   | 10 · 14 · 500 · 0.8 px · upper  | Section labels, dataset counts — Geist Mono       |

## Components

### Header (top of every screen)

```text
┌────────────────────────────────────────────┐
│  Meus pets                     [🔍] [+ Adicionar] │
│  3 pets registrados                        │
└────────────────────────────────────────────┘
```

- Padding `16/22 14/22 14/22 14/22` (Y/X). 1px `border` on bottom.
- Title: `title` ramp, `color: foreground`.
- Sub-line (count or short status): `meta` ramp, `color: mutedForeground`, `margin-top: 5`.
- Right cluster: optional ghost search icon (1px border square 34×34, `rounded-md`) + primary CTA "Adicionar" button.
- Primary button: 34 px height, `padding: 0 12px`, `rounded-md`, `bg: primary`, `color: primaryForeground`, label `body` (14·500), icon left (14 px, `stroke-width: 2.2`). `shadow: 0 1px 2px rgba(9,9,11,0.06)` in light; no shadow in dark.

### Avatar (rounded-md neutral)

- Size: 38 px on rows, 40 px in action-sheet preview, 32 px when used in inline contexts (none yet).
- Shape: `rounded-md` (8 px radius — **not** circle).
- Background: `muted` (zinc-100 light / zinc-800 dark).
- Foreground letter: `foreground` colour, 13 px / 600.
- Logic: first NFD-stripped letter of `name`, uppercased. **Drop the 6-tone hashed palette** that the current Avatar component uses — all avatars share the same neutral background. Single-pet apps don't need colour-coding; the letter alone is enough recognition.

### List (populated)

- Container: `list-card` — `bg: card`, 1px `border`, `border-radius: 12`, `overflow: hidden`. Outer horizontal margin: 22 px.
- Above the card, the meta row (`label-mono` ramp):
  ```text
  NOME · ESPÉCIE · IDADE                 03
  ```
  Padding `8/4`. Left text describes the columns; right shows the dataset count.
- Row: `padding: 12/14`, `display: flex`, `gap: 12`, `align: center`. 1px bottom `border` between rows; last row has none (handled by `:last-child` or by skipping the separator in `FlatList`'s `ItemSeparatorComponent`).
- Row content (left → right): Avatar, text block `{ name, meta }` (flex 1), chevron-right icon (16 px, `mutedForeground` at 60% opacity).
- Pressed state: `background: accent` (zinc-100 light / zinc-800 dark). 120 ms ease-out.
- Below the list: a single line of muted helper text — "Mantenha pressionado para mais ações", `meta` ramp, centered, 14 px above the tab bar.

### Empty state

```text
              ┌──┐
              │🐾 │   ← rounded-md medallion (64×64, muted bg, 1px border)
              └──┘
        Nenhum pet ainda
   Cadastre seu primeiro pet para começar
       a registrar vacinas e cuidados.

        [+ Adicionar pet]   ← primary button
```

- Container: `flex: 1`, centered, gap 18 px, horizontal padding 32 px.
- Medallion: 64×64, `rounded-md`, `bg: muted`, 1px `border`, icon centred (28 px, stroke 1.8, `color: foreground`). **Replaces the previous 144 px tinted-rings medallion**. The square shape rhymes with the row avatar.
- Title: `subtitle` ramp, centred.
- Description: `meta` ramp scaled up to 13 px / line 1.5, max-width 240 px, centred, `mutedForeground`.
- CTA: same primary button as header. `+ Adicionar pet`.

### Action sheet (long-press → preview + actions)

```text
─────────────  ← drag handle (36×4, muted, rounded-full)
  [L]  Luna
       Gata · 3 anos
─────────────────────────  ← 1px border, full width
  ✎  Editar pet                   ← rounded-md row, body ramp
  🗑  Excluir pet                  ← destructive colour
```

- Sheet: `bg: card`, top corners `rounded-16` (16 px — `rounded-xl`), drop shadow `0 -8px 30px -8px rgba(9,9,11,0.18)`.
- Scrim: `rgba(9,9,11,0.4)` with `backdrop-blur: 2px` where supported. Tap-to-close.
- Drag handle: 36×4, `bg: border`, `rounded-full`, margin `6/auto 14`.
- Preview row: same structure as a list row but no chevron, with 1px bottom border. Padding `0/20 14`.
- Actions: padding `8/12`. Each action row: `padding: 12`, `gap: 12`, `rounded-md`, hover/pressed → `bg: accent`.
- Edit icon: lucide `pencil-line` (or `edit-3`), 18 px, stroke 1.9, `color: foreground`.
- Delete icon: lucide `trash-2`, 18 px, `color: destructive`. Label `color: destructive`.

### Loading skeleton

- Render the same `list-card` shape with 3 placeholder rows.
- Each row uses the same dimensions as a real row but replaces avatar with a `38×38 rounded-md` `bg: muted` block, and the text block with two pill bars (`height: 10`, `rounded-full`, `bg: muted`, widths 50% and 30%).
- Animation: opacity shimmer `1 → 0.5 → 1` over 1.6 s ease-in-out, infinite.
- Header sub-line during loading: replace count with the literal text "Carregando…". Don't show meta-row dataset count (replace with `—`).

### Error state

- Header sub-line: "Erro ao carregar", in `destructive` colour.
- Body: centered, gap 12 px, padding `24/32 80/32`.
- Icon medallion: 44×44, `rounded-md`, `bg: destructiveSurface`, 1px `border: destructiveBorder`, alert-triangle icon (22 px, stroke 2, `color: destructive`).
- Title: 16 / 600 / -0.2 px, foreground.
- Description: 13 / 400 / line 1.5, `mutedForeground`, max-width 240, centred.
- Retry button: **secondary** style — 1px `border`, `bg: card`, `color: foreground`, refresh icon left. Not primary (the error itself is the call to attention; the action is recovery, not the page's primary action).

## Press / pressed states

- All `Pressable`s: 120 ms ease-out transitions on `backgroundColor` and `opacity`.
- Primary button pressed: `backgroundColor: primary at 90% opacity` (use shadcn-style overlay: render an `accent` overlay at 10% on top). In React Native: simply set `opacity: 0.92` and a small `scale: 0.98` transform.
- Ghost / secondary buttons pressed: `backgroundColor: accent`.
- Row pressed: `backgroundColor: accent`.
- Action sheet rows: same as row.
- No haptics on row tap (we keep `expo-haptics` for the tab bar `HapticTab` only).

## Icons

All icons via `lucide-react-native` stroke icons rendered through the existing `IconSymbol` component. **Replace the SF Symbol mapping approach** for the rounded-shape icons used on this screen with direct lucide names. The component's contract (`name: IconSymbolName` mapped through `MAPPING`) stays — we just swap the underlying renderer where the icon set doesn't map well to SF Symbols.

For Pets List specifically the icons used are: `plus`, `search`, `chevron-right`, `home`, `compass`, `paw-print`, `edit-3`, `trash-2`, `alert-triangle`, `refresh-cw`. All lucide. Update `components/ui/icon-symbol.tsx` and `components/ui/icon-symbol.ios.tsx` to use lucide on both platforms — the SF Symbols nuance is no longer worth the maintenance cost given the size of the icon set we use.

## Strings (PT-BR — unchanged from spec 01 unless noted)

| Slot                   | Copy                                                                              |
| ---------------------- | --------------------------------------------------------------------------------- |
| Screen title           | `Meus pets`                                                                       |
| Header sub (populated) | `{n} pets registrados` (e.g. `3 pets registrados`)                                |
| Header sub (empty)     | `Comece a registrar`                                                              |
| Header sub (loading)   | `Carregando…`                                                                     |
| Header sub (error)     | `Erro ao carregar`                                                                |
| List meta row          | `Nome · Espécie · Idade` / `{n.toString().padStart(2, '0')}`                      |
| List footer hint       | `Mantenha pressionado para mais ações`                                            |
| Empty title            | `Nenhum pet ainda`                                                                |
| Empty description      | `Cadastre seu primeiro pet para começar a registrar vacinas e cuidados.`          |
| Empty CTA              | `Adicionar pet` (icon `plus`)                                                     |
| Error title            | `Não foi possível carregar`                                                       |
| Error description      | `Verifique a conexão e tente novamente. Seus dados continuam salvos no aparelho.` |
| Error CTA              | `Tentar novamente` (icon `refresh-cw`)                                            |
| Action sheet — Edit    | `Editar pet`                                                                      |
| Action sheet — Delete  | `Excluir pet`                                                                     |
| Delete confirm — title | `Excluir?` _(unchanged)_                                                          |
| Delete confirm — body  | `Esta ação é irreversível.` _(unchanged)_                                         |

## Per-screen translation (visual language reuse)

The other 3 screens consume this same token set and pattern library. Notes for when their visuals are designed:

- **Pet Form (modal)** — `bg: card` modal; form fields use shadcn input pattern (`bg: card`, 1px `border`, `border-radius: 8`, `padding: 0/12`, `height: 36`, label above field in `meta` ramp uppercase). Species picker bottom-sheet inherits the action-sheet styling.
- **Pet Detail** — header pattern preserved; the photo (when present) becomes a card with `rounded-lg` and 1px border at the top of the page. Vaccines section uses the same `list-card` pattern with a `label-mono` section heading and an inline `+ Adicionar` ghost button on the right of the heading.
- **Vaccine Form (modal)** — identical to Pet Form for inputs. The BRL currency field uses the same input shell plus a leading `R$` adornment.

## Out of scope

- Photographic backgrounds, gradient meshes, illustration, custom animations beyond the press / shimmer / sheet-slide already specified.
- Brand accent colour. The design intentionally has none for the MVP.
- Tabular features (sort, filter, search input that actually does anything). The `search` ghost icon is a visual placeholder — wire-up is post-MVP.
- Reskinning of the `(tabs)` tab bar — `HapticTab` and the default react-navigation chrome stay as-is for the MVP. Only the icons get the lucide migration.

## Done when

- `constants/theme.ts` exports the updated `Theme` constant matching the tables above.
- `global.css` `@theme` block mirrors the same values.
- Geist + Geist Mono load on web and native; the app renders Geist for all `Text` and Geist Mono for elements with the `label-mono` ramp.
- `components/avatar.tsx` is `rounded-md`, `muted` bg, no hashed palette.
- `components/empty-state.tsx` renders the square-medallion variant with the new tokens.
- `components/pet-actions-sheet.tsx` renders the shadcn-styled sheet (drag handle, preview row, two actions, destructive coloured trash row).
- `app/(tabs)/index.tsx` renders the header, single `list-card` with hairlines, list footer hint, skeleton, and error state per this spec.
- Lucide icons replace the existing `IconSymbol` `MAPPING` entries; the component now uses `lucide-react-native` on iOS/Android/web.
- Both light and dark modes render correctly; switching the system color scheme updates everything.

Functional behaviour described in [`docs/specs/01-pets-list.md`](../../specs/01-pets-list.md) (navigation, data queries, accessibility) is unchanged.
