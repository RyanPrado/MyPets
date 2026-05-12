# Pets List shadcn Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the visual contract in `docs/superpowers/specs/2026-05-12-pets-list-shadcn-redesign.md` to the existing Pets List implementation (worktree `spec-01-pets-list`), replacing the "Soft Medallion" treatment with a disciplined shadcn-style language (zinc tokens, Geist typography, lucide icons, `rounded-md`, 1px borders).

**Architecture:** Token-first migration. Update `constants/theme.ts` `Theme` constant + `global.css` `@theme` block in lockstep so they never diverge. Then progress outwards through the visual stack: typography → icon primitive → leaf components (Avatar, EmptyState, PetActionsSheet) → screen (`app/(tabs)/index.tsx`). Each task produces a renderable intermediate state.

**Tech Stack:** Expo SDK 54 · React Native 0.81 · React 19 · React Compiler · NativeWind v5 preview · TypeScript strict · `lucide-react-native` (new) · `@expo-google-fonts/geist` family (new) · existing `@gorhom/bottom-sheet`, `expo-router`, `expo-sqlite`.

**Testing model:** No Jest. Verification is `npm run lint && npm run typecheck && npm run format:check` plus targeted manual checks on the emulator/web at the end of each task. The user runs the emulator themselves and approves visually before each commit. **The plan does NOT commit autonomously** — every commit step says "wait for user approval".

**Working directory:** All commands assume `cwd` is the worktree root `C:\Users\ryanp\Projetos\Faculdade\MyPets\.claude\worktrees\spec-01-pets-list`. Use the Bash tool (POSIX) — PowerShell-specific syntax noted where relevant.

**Spec references:**

- Functional contract (unchanged): [`docs/specs/01-pets-list.md`](../../specs/01-pets-list.md)
- Visual contract (this plan implements): [`docs/superpowers/specs/2026-05-12-pets-list-shadcn-redesign.md`](../specs/2026-05-12-pets-list-shadcn-redesign.md)

---

## File Structure

| File                                 | Action  | Responsibility                                                                                                                                 |
| ------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `constants/theme.ts`                 | Modify  | Update `Theme` zinc values + new keys (`muted`, `accent`, `destructiveSurface`, `destructiveBorder`); add `FontFamilies` export                |
| `global.css`                         | Modify  | Mirror new `@theme` token values                                                                                                               |
| `app/_layout.tsx`                    | Modify  | Wire `useFonts` for Geist + Geist Mono; gate render on font-load via `SplashScreen`                                                            |
| `components/ui/icon-symbol.tsx`      | Rewrite | Replace MaterialIcons with `lucide-react-native`; expanded MAPPING for new names                                                               |
| `components/ui/icon-symbol.ios.tsx`  | Rewrite | Same lucide-based impl as `.tsx` (no SF Symbols anymore)                                                                                       |
| `components/avatar.tsx`              | Rewrite | Drop 6-tone palette + circle; use `rounded-md` muted neutral with single letter                                                                |
| `components/empty-state.tsx`         | Rewrite | Square 64 px medallion (muted bg, border), shadcn type ramp, primary CTA                                                                       |
| `components/pet-actions-sheet.tsx`   | Rewrite | Drag handle, preview row (no chevron), `rounded-md` action rows, destructive `trash-2` row                                                     |
| `app/(tabs)/index.tsx`               | Rewrite | Header with title/subline/CTA; `list-card` with hairlines; skeleton with shimmer; error w/ secondary CTA                                       |
| `package.json` + `package-lock.json` | Modify  | New deps via `expo install`: `lucide-react-native`, `@expo-google-fonts/geist`, `@expo-google-fonts/geist-mono`, `react-native-svg` if missing |

Files **not** touched: `lib/migrations/*`, `lib/constants/species.ts`, `lib/db-types.ts`, `lib/pet-meta.ts`, `app/(tabs)/_layout.tsx` (tab structure unchanged — only icon mapping migrates underneath it).

---

## Pre-Flight Checklist

Run once at the start of the session to make sure baseline is green before any change.

- [ ] **Step P.1: Verify worktree state**

  Run: `git status -sb && git log -1 --oneline`
  Expected: branch `worktree-spec-01-pets-list`, working tree clean or only the previously-discussed modifications.

- [ ] **Step P.2: Verify baseline lint/typecheck/format**

  Run sequentially:

  ```bash
  npm run typecheck
  npm run lint
  npm run format:check
  ```

  Expected: all three exit 0. If any fails, **STOP** and fix before proceeding — we can't tell our changes from pre-existing issues otherwise.

- [ ] **Step P.3: Confirm the spec file paths are reachable**

  Run: `ls docs/specs/01-pets-list.md docs/superpowers/specs/2026-05-12-pets-list-shadcn-redesign.md`
  Expected: both files listed (no errors).

---

## Task 1: Tokens — update `Theme` + `global.css`

The token migration must happen before component changes — every subsequent rewrite reads from `Theme[scheme]`.

**Files:**

- Modify: `constants/theme.ts` — `Theme` constant
- Modify: `global.css` — `@theme` block

- [ ] **Step 1.1: Read the current `Theme` constant**

  Run: read `constants/theme.ts` (whole file) so the next edit has surrounding context.

- [ ] **Step 1.2: Replace the `Theme` constant body**

  Replace the existing `Theme = { light: {...}, dark: {...} }` block with this exact content:

  ```ts
  /**
   * Semantic theme tokens that mirror the @theme block in `global.css` (shadcn
   * naming, zinc palette). Use these in RN `style={}` values; NativeWind's
   * custom @theme utilities are unreliable on the v5 preview against custom
   * tokens, so this object is the source of truth for runtime styling.
   * Keep these values in sync with `global.css`.
   */
  export const Theme = {
    light: {
      background: '#ffffff',
      foreground: '#09090b',
      card: '#ffffff',
      muted: '#f4f4f5',
      mutedForeground: '#71717a',
      border: '#e4e4e7',
      primary: '#18181b',
      primaryForeground: '#fafafa',
      accent: '#f4f4f5',
      destructive: '#dc2626',
      destructiveForeground: '#fafafa',
      destructiveSurface: '#fef2f2',
      destructiveBorder: '#fecaca',
    },
    dark: {
      background: '#09090b',
      foreground: '#fafafa',
      card: '#09090b',
      muted: '#27272a',
      mutedForeground: '#a1a1aa',
      border: '#27272a',
      primary: '#fafafa',
      primaryForeground: '#18181b',
      accent: '#27272a',
      destructive: '#ef4444',
      destructiveForeground: '#fafafa',
      destructiveSurface: '#450a0a',
      destructiveBorder: '#7f1d1d',
    },
  } as const;
  ```

  Do NOT touch the `Colors` export above it — that backs `@react-navigation/native`'s `ThemeProvider` and the tab bar; changing it would cause regressions outside this redesign's scope.

- [ ] **Step 1.3: Replace the `@theme` block in `global.css`**

  Open `global.css`. Replace the existing `@theme { ... }` block with:

  ```css
  @theme {
    --color-background: #ffffff;
    --color-foreground: #09090b;
    --color-card: #ffffff;
    --color-muted: #f4f4f5;
    --color-muted-foreground: #71717a;
    --color-border: #e4e4e7;
    --color-primary: #18181b;
    --color-primary-foreground: #fafafa;
    --color-accent: #f4f4f5;
    --color-destructive: #dc2626;
    --color-destructive-foreground: #fafafa;
    --color-destructive-surface: #fef2f2;
    --color-destructive-border: #fecaca;
  }
  ```

  Replace the `@media (prefers-color-scheme: dark) { @theme { ... } }` block with:

  ```css
  @media (prefers-color-scheme: dark) {
    @theme {
      --color-background: #09090b;
      --color-foreground: #fafafa;
      --color-card: #09090b;
      --color-muted: #27272a;
      --color-muted-foreground: #a1a1aa;
      --color-border: #27272a;
      --color-primary: #fafafa;
      --color-primary-foreground: #18181b;
      --color-accent: #27272a;
      --color-destructive: #ef4444;
      --color-destructive-foreground: #fafafa;
      --color-destructive-surface: #450a0a;
      --color-destructive-border: #7f1d1d;
    }
  }
  ```

- [ ] **Step 1.4: Validate**

  Run:

  ```bash
  npm run typecheck && npm run lint && npx prettier --write constants/theme.ts global.css && npm run format:check
  ```

  Expected: all green. Typecheck must pass because `pet-actions-sheet.tsx`, `index.tsx`, and `empty-state.tsx` all read `Theme[scheme].destructive`/`mutedForeground`/etc. — those keys still exist (the new ones are _additions_, not renames).

- [ ] **Step 1.5: Checkpoint — wait for user approval**

  Show the diff to the user:

  ```bash
  git diff constants/theme.ts global.css
  ```

  The user will eyeball the values. Do NOT commit. Wait for explicit "approved" or "go" from the user before moving to Task 2.

---

## Task 2: Install Geist fonts + verify package names

Geist isn't trivially available — it's distributed via either `@expo-google-fonts/geist` (preferred, bundles OTFs locally) or via the more granular `@expo-google-fonts/dev` package. We verify the exact package names from the npm registry before installing.

**Files:**

- Modify: `package.json`, `package-lock.json` (via `expo install`)

- [ ] **Step 2.1: Verify the sans package exists**

  Run: `npm view @expo-google-fonts/geist version 2>&1 || echo "NOT FOUND"`
  Expected: prints a semver (e.g. `0.3.0`). If `NOT FOUND`, fall back to **Plan B** in Step 2.5.

- [ ] **Step 2.2: Verify the mono package exists**

  Run: `npm view @expo-google-fonts/geist-mono version 2>&1 || echo "NOT FOUND"`
  Expected: prints a semver. If `NOT FOUND`, fall back to **Plan B** in Step 2.5.

- [ ] **Step 2.3: Install the font packages**

  Run: `npx expo install @expo-google-fonts/geist @expo-google-fonts/geist-mono`
  Expected: both packages added to `dependencies` in `package.json`.

  _(Why `expo install` and not `npm install`? `expo install` checks SDK compatibility and pins to versions known to work with SDK 54.)_

- [ ] **Step 2.4: Confirm `expo-font` is available**

  Run: `node -e "console.log(require('./node_modules/expo-font/package.json').version)"`
  Expected: prints a semver (Expo SDK 54 ships `expo-font` as a transitive dep — no install needed). If `Cannot find module`, run `npx expo install expo-font` first.

- [ ] **Step 2.5: PLAN B — if either Geist package is missing from npm**

  Skip Step 2.3 and instead:
  1. Run: `npx expo install @expo-google-fonts/dev` — this is a meta package that exposes all Google Fonts on demand.
  2. Note in your handoff: in all subsequent steps, replace `import { Geist_400Regular, ... } from '@expo-google-fonts/geist'` with `import { Geist_400Regular, ... } from '@expo-google-fonts/dev'`. The font-name constants are identical between the two packages.

- [ ] **Step 2.6: Validate baseline still works**

  Run: `npm run typecheck`
  Expected: exit 0. (No code change yet, just package metadata — typecheck must still pass.)

- [ ] **Step 2.7: Checkpoint — wait for user approval**

  Show the package.json diff:

  ```bash
  git diff package.json
  ```

  Do NOT commit. Wait for user "approved" before Task 3.

---

## Task 3: `FontFamilies` helper + wire `useFonts` in root layout

Geist needs to be **loaded** (via `expo-font`) before any `<Text>` references its `fontFamily`. We add a `FontFamilies` export to `constants/theme.ts` so other files import a typed accessor instead of stringly-typed `'Geist_500Medium'` everywhere.

**Files:**

- Modify: `constants/theme.ts` — add `FontFamilies` export
- Modify: `app/_layout.tsx` — `useFonts` + `SplashScreen` gating

- [ ] **Step 3.1: Append `FontFamilies` to `constants/theme.ts`**

  Add at the bottom of `constants/theme.ts` (below the existing `Fonts = Platform.select(...)` export):

  ```ts
  /**
   * Named font families loaded by `useFonts` in `app/_layout.tsx`. Use these
   * as the `fontFamily` value in StyleSheet — they correspond to the
   * `@expo-google-fonts/geist` constants of the same name.
   */
  export const FontFamilies = {
    sans: {
      regular: 'Geist_400Regular',
      medium: 'Geist_500Medium',
      semibold: 'Geist_600SemiBold',
      bold: 'Geist_700Bold',
    },
    mono: {
      regular: 'GeistMono_400Regular',
      medium: 'GeistMono_500Medium',
    },
  } as const;
  ```

- [ ] **Step 3.2: Read the current `app/_layout.tsx`**

  Run: read `app/_layout.tsx` to capture the current `RootLayout` structure (it has `GestureHandlerRootView` → `SQLiteProvider` → `BottomSheetModalProvider` → `ThemeProvider` → `Stack`).

- [ ] **Step 3.3: Update `app/_layout.tsx` to load Geist before render**

  Replace the imports section + `RootLayout` function with the version below. Keep everything else (the `SQLiteProvider` wiring, `initDb`, `unstable_settings`) as it is.

  New imports (replace existing import block):

  ```tsx
  import '@/global.css';

  import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
  import {
    useFonts,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  } from '@expo-google-fonts/geist';
  import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
  import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
  import { Stack } from 'expo-router';
  import * as SplashScreen from 'expo-splash-screen';
  import { StatusBar } from 'expo-status-bar';
  import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
  import { useEffect } from 'react';
  import { GestureHandlerRootView } from 'react-native-gesture-handler';
  import 'react-native-reanimated';

  import { useColorScheme } from '@/hooks/use-color-scheme';
  import { DATABASE_NAME } from '@/lib/db';
  import { runMigrations } from '@/lib/migrations';
  import { runInitSeeders } from '@/lib/seeders';

  void SplashScreen.preventAutoHideAsync();
  ```

  New `RootLayout` body (replace the existing function):

  ```tsx
  export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [fontsLoaded, fontsError] = useFonts({
      Geist_400Regular,
      Geist_500Medium,
      Geist_600SemiBold,
      Geist_700Bold,
      GeistMono_400Regular,
      GeistMono_500Medium,
    });

    useEffect(() => {
      if (fontsLoaded || fontsError) {
        void SplashScreen.hideAsync();
      }
    }, [fontsLoaded, fontsError]);

    if (!fontsLoaded && !fontsError) {
      return null;
    }

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDb}>
          <BottomSheetModalProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </BottomSheetModalProvider>
        </SQLiteProvider>
      </GestureHandlerRootView>
    );
  }
  ```

  Rationale notes:
  - `preventAutoHideAsync` is called at module scope (not inside a hook) so the splash holds from first JS evaluation. It returns a promise we intentionally ignore with `void` — failure to hold the splash is non-fatal.
  - The early `return null` while fonts are pending is what keeps the splash visible — there's nothing else to render.
  - We pass both `fontsLoaded` and `fontsError` to `hideAsync` so a font-load failure (e.g. offline first launch) still unblocks the app.

- [ ] **Step 3.4: Validate**

  Run:

  ```bash
  npm run typecheck && npm run lint && npx prettier --write app/_layout.tsx constants/theme.ts && npm run format:check
  ```

  Expected: all green.

  Common gotcha: if typecheck complains "module not found '@expo-google-fonts/geist-mono'" but Step 2.2 reported the package exists, run `npm install` once more to re-link node_modules in the worktree (worktree node_modules can drift from `package-lock.json` if `npm install` was interrupted).

- [ ] **Step 3.5: Restart Metro with cache clear and verify on emulator**

  Tell the user: stop the running Metro (Ctrl+C), then run `npx expo start --clear`. On the emulator, fully close + reopen the Expo Go app (or reinstall the dev client) so the bundle includes the new font assets.

  Visual verification: the text on screen should now render in Geist (cleaner / more "modern" curves than the system default). If text is invisible after this step, the font name strings are wrong — re-check Step 3.1 vs the actual exports from `@expo-google-fonts/geist`.

- [ ] **Step 3.6: Checkpoint — wait for user approval**

  Show:

  ```bash
  git diff app/_layout.tsx constants/theme.ts
  ```

  Wait for user "approved" before Task 4.

---

## Task 4: Install lucide + react-native-svg (if needed)

Lucide is delivered via `lucide-react-native`, which depends on `react-native-svg`. SVG might already be transitively installed by `@gorhom/bottom-sheet`; we verify and install only what's missing.

**Files:**

- Modify: `package.json`, `package-lock.json` (via `expo install`)

- [ ] **Step 4.1: Check if `react-native-svg` is already installed**

  Run: `node -e "try { console.log(require('./node_modules/react-native-svg/package.json').version) } catch { console.log('MISSING') }"`
  - If a semver prints: skip Step 4.2.
  - If `MISSING`: do Step 4.2.

- [ ] **Step 4.2: Install `react-native-svg` (only if missing)**

  Run: `npx expo install react-native-svg`
  Expected: added to `dependencies` with an SDK-54-compatible version.

- [ ] **Step 4.3: Install `lucide-react-native`**

  Run: `npx expo install lucide-react-native`
  Expected: added to `dependencies`. If `expo install` warns it doesn't recognise the package (lucide isn't in the Expo compatibility matrix), it'll fall back to `npm install` and pick the latest — that's fine.

- [ ] **Step 4.4: Smoke-test that lucide imports compile**

  Create a throwaway file `scratch-icon-test.ts` with:

  ```ts
  import { Home, Plus, ChevronRight } from 'lucide-react-native';
  console.log(Home, Plus, ChevronRight);
  ```

  Run: `npx tsc --noEmit scratch-icon-test.ts`
  Expected: exit 0. Then delete: `rm scratch-icon-test.ts`.

- [ ] **Step 4.5: Validate baseline**

  Run: `npm run typecheck`
  Expected: exit 0.

- [ ] **Step 4.6: Checkpoint — wait for user approval**

  Show: `git diff package.json`. Wait for "approved".

---

## Task 5: Rewrite `IconSymbol` to use lucide on all platforms

We replace both `icon-symbol.tsx` (Android/web) and `icon-symbol.ios.tsx` (iOS) with a single lucide-based implementation. The `IconSymbolName` contract widens to include the new icons we need (`search`, `alert-triangle`, `refresh-cw`, `pencil-line`, `compass`). Existing call sites (`house.fill`, `plus.circle.fill`, etc.) keep working because we keep their keys in the new MAPPING.

**Files:**

- Rewrite: `components/ui/icon-symbol.tsx`
- Rewrite: `components/ui/icon-symbol.ios.tsx`

- [ ] **Step 5.1: Rewrite `components/ui/icon-symbol.tsx` (the Android/web/default file)**

  Replace the entire file content with:

  ```tsx
  import {
    AlertTriangle,
    ChevronRight,
    Code2,
    Compass,
    Home,
    PawPrint,
    PencilLine,
    Plus,
    PlusCircle,
    RefreshCw,
    Search,
    Send,
    Trash2,
    type LucideIcon,
  } from 'lucide-react-native';
  import { type StyleProp, type TextStyle, type OpaqueColorValue } from 'react-native';

  /**
   * Symbolic names used across the app. We keep the SF-Symbol-style keys for
   * backwards compat with the existing call sites (e.g. `house.fill`,
   * `plus.circle.fill`) and map them to lucide icons. New code can use the
   * lucide-native names too — they're added as additional keys below.
   */
  const MAPPING: Record<string, LucideIcon> = {
    // legacy SF-Symbol keys (still referenced from app/(tabs)/_layout.tsx and prior code)
    'house.fill': Home,
    'paperplane.fill': Send,
    'chevron.left.forwardslash.chevron.right': Code2,
    'chevron.right': ChevronRight,
    'plus.circle.fill': PlusCircle,
    plus: Plus,
    'pawprint.fill': PawPrint,
    'square.and.pencil': PencilLine,
    trash: Trash2,
    // shadcn redesign additions
    search: Search,
    'alert-triangle': AlertTriangle,
    'refresh-cw': RefreshCw,
    compass: Compass,
  };

  export type IconSymbolName = keyof typeof MAPPING;

  export function IconSymbol({
    name,
    size = 24,
    color,
    style,
    weight,
  }: {
    name: IconSymbolName;
    size?: number;
    color: string | OpaqueColorValue;
    style?: StyleProp<TextStyle>;
    weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
  }) {
    const Icon = MAPPING[name];
    if (!Icon) {
      if (__DEV__) {
        console.warn(`IconSymbol: unknown name "${name}"`);
      }
      return null;
    }

    // map shadcn weight names to lucide strokeWidth
    const strokeWidth =
      weight === 'light'
        ? 1.5
        : weight === 'medium'
          ? 2
          : weight === 'semibold' || weight === 'bold'
            ? 2.4
            : 2;

    return <Icon size={size} color={color as string} strokeWidth={strokeWidth} style={style} />;
  }
  ```

  Why we cast `color as string` for lucide: lucide-react-native's prop type is `string`, but the existing API surface accepts `OpaqueColorValue` (used by some RN navigation props). RN's `ColorValue` widening means casting is the lowest-friction fix — lucide will still receive the resolved colour at runtime.

- [ ] **Step 5.2: Rewrite `components/ui/icon-symbol.ios.tsx`**

  Replace the entire file content with a re-export of the cross-platform implementation:

  ```tsx
  // iOS used to use native SF Symbols. As of the shadcn redesign we standardise
  // on lucide across all platforms — fewer surprises, single icon vocabulary.
  // This file intentionally re-exports the cross-platform impl.
  export { IconSymbol, type IconSymbolName } from './icon-symbol';
  ```

  _(Why keep the .ios.tsx file at all? Metro resolves platform suffixes at bundle time. Deleting the file is also valid, but keeping it as a re-export makes the platform-divergence audit explicit — a future reader sees "ah, iOS used to fork and no longer does".)_

- [ ] **Step 5.3: Validate**

  Run: `npm run typecheck`

  Expected: passes. If it errors on a call site using a name not in MAPPING (e.g. some leftover icon I missed), add the lucide equivalent to the import + MAPPING. The likely call sites are `app/(tabs)/_layout.tsx` (uses `house.fill`, `paperplane.fill`) and `components/collapsible.tsx` if it uses any icons (check it).

  Then:

  ```bash
  npm run lint && npx prettier --write components/ui/icon-symbol.tsx components/ui/icon-symbol.ios.tsx && npm run format:check
  ```

- [ ] **Step 5.4: Restart Metro with --clear**

  Same as Step 3.5 — Metro caches the icon module aggressively because of `require.context` and platform-suffix resolution. Without `--clear` you may see the old MaterialIcons rendering and waste time debugging.

- [ ] **Step 5.5: Visual smoke check**

  On the emulator, the tab bar icons (home + paperplane) should now be lucide-stroke icons (thinner, more uniform stroke) instead of filled MaterialIcons. The header `+` button on Pets List should render. Nothing should be invisible.

  If anything is invisible: typo in the icon name mapping. Open `components/ui/icon-symbol.tsx` and grep for the warning that fires from the `__DEV__` branch.

- [ ] **Step 5.6: Checkpoint — wait for user approval**

  Show: `git diff components/ui/`. Wait for "approved".

---

## Task 6: Refactor `Avatar` to rounded-md neutral

Drop the deterministic 6-tone palette. All avatars become a 38 px (default) `rounded-md` square with `muted` background and the foreground-coloured letter.

**Files:**

- Rewrite: `components/avatar.tsx`

- [ ] **Step 6.1: Read the current file**

  Run: read `components/avatar.tsx` for context (we want to keep its existing API surface — `name: string`, `size?: 'sm' | 'md' | 'lg'`, plus `ViewProps`).

- [ ] **Step 6.2: Replace the file content**

  ```tsx
  import { StyleSheet, Text, View, type ViewProps } from 'react-native';

  import { FontFamilies, Theme } from '@/constants/theme';
  import { useColorScheme } from '@/hooks/use-color-scheme';

  export type AvatarSize = 'sm' | 'md' | 'lg';

  export type AvatarProps = ViewProps & {
    name: string;
    size?: AvatarSize;
  };

  const DIMENSIONS: Record<AvatarSize, { box: number; font: number; radius: number }> = {
    sm: { box: 32, font: 12, radius: 7 },
    md: { box: 38, font: 13, radius: 8 },
    lg: { box: 48, font: 16, radius: 10 },
  };

  function initial(name: string): string {
    const stripped = name.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const first = stripped.trim().charAt(0);
    return first ? first.toUpperCase() : '?';
  }

  export function Avatar({ name, size = 'md', style, ...rest }: AvatarProps) {
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];
    const dim = DIMENSIONS[size];

    return (
      <View
        accessible={false}
        style={[
          styles.base,
          {
            width: dim.box,
            height: dim.box,
            borderRadius: dim.radius,
            backgroundColor: theme.muted,
          },
          style,
        ]}
        {...rest}
      >
        <Text
          style={[
            styles.label,
            {
              fontSize: dim.font,
              color: theme.foreground,
            },
          ]}
        >
          {initial(name)}
        </Text>
      </View>
    );
  }

  const styles = StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontFamily: FontFamilies.sans.semibold,
      includeFontPadding: false,
    },
  });
  ```

  Notes:
  - `includeFontPadding: false` (Android-only prop, ignored elsewhere) removes the extra vertical padding RN adds around `Text` so the letter sits visually centred in the small box.
  - We drop the old PALETTE and `hashIndex` — no longer used. If any other component imported them, fix at the import site (none should — Avatar didn't export them).

- [ ] **Step 6.3: Validate**

  Run:

  ```bash
  npm run typecheck && npm run lint && npx prettier --write components/avatar.tsx && npm run format:check
  ```

- [ ] **Step 6.4: Visual smoke check**

  Restart Metro is **not** needed for this change (no `require.context` involved, no font assets, no icon mapping). A Fast Refresh is enough.

  On the emulator: long-press a pet row (if any pets exist via dev seeder; otherwise verify on the action-sheet mockup) — the avatar should now be a square with rounded corners and a single neutral letter on a light grey background. No more rotation of colours.

- [ ] **Step 6.5: Checkpoint — wait for user approval**

  Show: `git diff components/avatar.tsx`. Wait for "approved".

---

## Task 7: Refactor `EmptyState` to square medallion + new tokens

Square 64 px medallion with `muted` background, 1px border, lucide icon centred. Title in `subtitle` ramp; description capped at 240 px max-width; primary CTA.

**Files:**

- Rewrite: `components/empty-state.tsx`

- [ ] **Step 7.1: Read the current file**

  Run: read `components/empty-state.tsx` for context.

- [ ] **Step 7.2: Replace the file content**

  ```tsx
  import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

  import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
  import { FontFamilies, Theme } from '@/constants/theme';
  import { useColorScheme } from '@/hooks/use-color-scheme';

  export type EmptyStateProps = {
    icon: IconSymbolName;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    actionAccessibilityLabel?: string;
  };

  export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    actionAccessibilityLabel,
  }: EmptyStateProps) {
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];

    return (
      <View style={styles.container}>
        <View
          style={[styles.medallion, { backgroundColor: theme.muted, borderColor: theme.border }]}
        >
          <IconSymbol name={icon} size={28} color={theme.foreground} weight="regular" />
        </View>

        <Text accessibilityRole="header" style={[styles.title, { color: theme.foreground }]}>
          {title}
        </Text>

        <Text style={[styles.description, { color: theme.mutedForeground }]}>{description}</Text>

        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
            onPress={onAction}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
              buttonShadow(scheme),
            ]}
          >
            <IconSymbol name="plus" size={14} color={theme.primaryForeground} weight="semibold" />
            <Text style={[styles.buttonLabel, { color: theme.primaryForeground }]}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      paddingHorizontal: 32,
    },
    medallion: {
      width: 64,
      height: 64,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth * 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: FontFamilies.sans.semibold,
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    description: {
      fontFamily: FontFamilies.sans.regular,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 240,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    buttonLabel: {
      fontFamily: FontFamilies.sans.medium,
      fontSize: 14,
      letterSpacing: -0.1,
    },
  });

  function buttonShadow(scheme: 'light' | 'dark') {
    if (scheme === 'dark') return null;
    return Platform.select({
      ios: {
        shadowColor: '#09090b',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 2px rgba(9,9,11,0.06)' },
      default: null,
    });
  }
  ```

  Why no shadow in dark mode: dark elevation looks muddy on near-black; the contrast vs. background is already sufficient.

- [ ] **Step 7.3: Validate**

  ```bash
  npm run typecheck && npm run lint && npx prettier --write components/empty-state.tsx && npm run format:check
  ```

- [ ] **Step 7.4: Visual smoke check**

  On the emulator with zero pets: header → small square medallion centred with a paw icon → "Nenhum pet ainda" title → description (≤ 240 px wide, wraps to 2-3 lines) → black pill button with `+` + "Adicionar pet" text. Press button: light scale-down + opacity dim.

  Verify in dark mode (toggle system theme): everything inverts cleanly — medallion bg becomes zinc-800, foreground letter zinc-50, primary button becomes white with black text. Border still visible.

- [ ] **Step 7.5: Checkpoint — wait for user approval**

  Show: `git diff components/empty-state.tsx`. Wait for "approved".

---

## Task 8: Refactor `PetActionsSheet` to shadcn style

Drag handle, preview row (no chevron), `rounded-md` action rows that highlight `accent` on press, destructive trash row.

**Files:**

- Rewrite: `components/pet-actions-sheet.tsx`

- [ ] **Step 8.1: Read the current file**

  Run: read `components/pet-actions-sheet.tsx`.

- [ ] **Step 8.2: Replace the file content**

  ```tsx
  import {
    BottomSheetBackdrop,
    type BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetView,
  } from '@gorhom/bottom-sheet';
  import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
  import { Pressable, StyleSheet, Text, View } from 'react-native';

  import { Avatar } from '@/components/avatar';
  import { IconSymbol } from '@/components/ui/icon-symbol';
  import { FontFamilies, Theme } from '@/constants/theme';
  import { useColorScheme } from '@/hooks/use-color-scheme';
  import type { Pet } from '@/lib/db-types';
  import { formatPetMeta } from '@/lib/pet-meta';

  export type PetActionsSheetRef = {
    present: (pet: Pet) => void;
    dismiss: () => void;
  };

  export type PetActionsSheetProps = {
    onEdit: (pet: Pet) => void;
    onDelete: (pet: Pet) => void;
  };

  export const PetActionsSheet = forwardRef<PetActionsSheetRef, PetActionsSheetProps>(
    function PetActionsSheet({ onEdit, onDelete }, ref) {
      const modalRef = useRef<BottomSheetModal>(null);
      const [pet, setPet] = useState<Pet | null>(null);
      const scheme = useColorScheme() ?? 'light';
      const theme = Theme[scheme];

      useImperativeHandle(
        ref,
        () => ({
          present(nextPet) {
            setPet(nextPet);
            modalRef.current?.present();
          },
          dismiss() {
            modalRef.current?.dismiss();
          },
        }),
        []
      );

      const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.4}
            pressBehavior="close"
          />
        ),
        []
      );

      const handleEdit = () => {
        if (!pet) return;
        const target = pet;
        modalRef.current?.dismiss();
        onEdit(target);
      };

      const handleDelete = () => {
        if (!pet) return;
        const target = pet;
        modalRef.current?.dismiss();
        onDelete(target);
      };

      return (
        <BottomSheetModal
          ref={modalRef}
          enableDynamicSizing
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: theme.card, borderRadius: 16 }}
          handleComponent={() => (
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>
          )}
        >
          <BottomSheetView>
            {pet ? (
              <View style={styles.container}>
                <View style={[styles.preview, { borderBottomColor: theme.border }]}>
                  <Avatar name={pet.name} size="md" />
                  <View style={styles.previewText}>
                    <Text
                      style={[styles.previewName, { color: theme.foreground }]}
                      numberOfLines={1}
                    >
                      {pet.name}
                    </Text>
                    <Text
                      style={[styles.previewMeta, { color: theme.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {formatPetMeta(pet.species, pet.birth_date)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${pet.name}`}
                    onPress={handleEdit}
                    style={({ pressed }) => [
                      styles.action,
                      { backgroundColor: pressed ? theme.accent : 'transparent' },
                    ]}
                  >
                    <IconSymbol name="square.and.pencil" size={18} color={theme.foreground} />
                    <Text style={[styles.actionLabel, { color: theme.foreground }]}>
                      Editar pet
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Excluir ${pet.name}`}
                    onPress={handleDelete}
                    style={({ pressed }) => [
                      styles.action,
                      { backgroundColor: pressed ? theme.accent : 'transparent' },
                    ]}
                  >
                    <IconSymbol name="trash" size={18} color={theme.destructive} />
                    <Text style={[styles.actionLabel, { color: theme.destructive }]}>
                      Excluir pet
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </BottomSheetView>
        </BottomSheetModal>
      );
    }
  );

  const styles = StyleSheet.create({
    handleContainer: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 4,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 999,
    },
    container: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      paddingTop: 4,
    },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 8,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    previewText: {
      flex: 1,
    },
    previewName: {
      fontFamily: FontFamilies.sans.semibold,
      fontSize: 14,
      letterSpacing: -0.1,
    },
    previewMeta: {
      fontFamily: FontFamilies.sans.regular,
      fontSize: 12,
      marginTop: 2,
    },
    actions: {
      paddingTop: 8,
      gap: 2,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
    },
    actionLabel: {
      fontFamily: FontFamilies.sans.medium,
      fontSize: 14,
      letterSpacing: -0.1,
    },
  });
  ```

  Why we override `handleComponent` instead of using `handleIndicatorStyle`: the default sheet handle has its own container with hardcoded padding that doesn't match our 8 px top breathing room. A custom `handleComponent` is the cleanest way to align the drag indicator.

- [ ] **Step 8.3: Validate**

  ```bash
  npm run typecheck && npm run lint && npx prettier --write components/pet-actions-sheet.tsx && npm run format:check
  ```

- [ ] **Step 8.4: Visual smoke check**

  Requires at least one pet to exist. If the DB is empty, briefly insert a pet via a dev seeder OR via temporary SQL — see "Manual verification setup" in Task 10 for how. On the emulator, long-press a pet row → bottom sheet slides up with: scrim 40 % darken, drag handle (small horizontal pill), preview row (avatar + name + meta), 1px separator, "Editar pet" row (pencil icon + foreground text), "Excluir pet" row (trash icon + red text). Press either row: brief `accent` background flash before dismissal.

- [ ] **Step 8.5: Checkpoint — wait for user approval**

  Show: `git diff components/pet-actions-sheet.tsx`. Wait for "approved".

---

## Task 9: Rewrite the Pets List screen

Header (title + count + ghost search + primary CTA), `list-card` with hairlines, `label-mono` meta row, list footer hint, skeleton with shimmer, error state with secondary retry CTA.

**Files:**

- Rewrite: `app/(tabs)/index.tsx`

- [ ] **Step 9.1: Read the current file**

  Run: read `app/(tabs)/index.tsx` to confirm the structure we're replacing (navigation helpers, query, delete flow stays).

- [ ] **Step 9.2: Replace the file content**

  ```tsx
  import { router, useFocusEffect } from 'expo-router';
  import { useCallback, useEffect, useRef, useState } from 'react';
  import {
    Alert,
    Animated,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';

  import { Avatar } from '@/components/avatar';
  import { EmptyState } from '@/components/empty-state';
  import { PetActionsSheet, type PetActionsSheetRef } from '@/components/pet-actions-sheet';
  import { IconSymbol } from '@/components/ui/icon-symbol';
  import { FontFamilies, Theme } from '@/constants/theme';
  import { useColorScheme } from '@/hooks/use-color-scheme';
  import { useSQLiteContext } from '@/lib/db';
  import type { Pet } from '@/lib/db-types';
  import { formatPetMeta } from '@/lib/pet-meta';

  type Status = 'loading' | 'ready' | 'error';

  // Routes /pet-form and /pet/[id] are created in specs 02 and 03. Until they
  // exist, typed-routes rejects the literals — bypass with a thin helper.
  function navigate(path: string) {
    router.push(path as never);
  }

  export default function PetsScreen() {
    const db = useSQLiteContext();
    const [pets, setPets] = useState<Pet[]>([]);
    const [status, setStatus] = useState<Status>('loading');
    const [refreshing, setRefreshing] = useState(false);
    const sheetRef = useRef<PetActionsSheetRef>(null);
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];

    const load = useCallback(async () => {
      try {
        const rows = await db.getAllAsync<Pet>(
          'SELECT id, name, species, birth_date, photo_uri, created_at FROM pets ORDER BY name COLLATE NOCASE'
        );
        setPets(rows);
        setStatus('ready');
      } catch (err) {
        console.warn('Failed to load pets', err);
        setStatus('error');
      }
    }, [db]);

    useFocusEffect(
      useCallback(() => {
        void load();
      }, [load])
    );

    const onRefresh = async () => {
      setRefreshing(true);
      await load();
      setRefreshing(false);
    };

    const goToCreate = () => navigate('/pet-form');
    const goToDetail = (id: number) => navigate(`/pet/${id}`);
    const goToEdit = (id: number) => navigate(`/pet-form?id=${id}`);

    const handleEdit = (pet: Pet) => goToEdit(pet.id);

    const handleDelete = (pet: Pet) => {
      Alert.alert('Excluir?', 'Esta ação é irreversível.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM pets WHERE id = ?', pet.id);
              await load();
            } catch (err) {
              console.warn('Failed to delete pet', err);
              Alert.alert('Erro', 'Não foi possível excluir o pet. Tente novamente.');
            }
          },
        },
      ]);
    };

    const retry = () => {
      setStatus('loading');
      void load();
    };

    const subline =
      status === 'loading'
        ? 'Carregando…'
        : status === 'error'
          ? 'Erro ao carregar'
          : pets.length === 0
            ? 'Comece a registrar'
            : `${pets.length} pets registrados`;

    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerText}>
            <Text
              accessibilityRole="header"
              style={[styles.headerTitle, { color: theme.foreground }]}
            >
              Meus pets
            </Text>
            <Text
              style={[
                styles.headerSubline,
                { color: status === 'error' ? theme.destructive : theme.mutedForeground },
              ]}
            >
              {subline}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buscar pets"
              hitSlop={6}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  borderColor: theme.border,
                  backgroundColor: pressed ? theme.accent : 'transparent',
                },
              ]}
            >
              <IconSymbol name="search" size={16} color={theme.foreground} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar pet"
              onPress={goToCreate}
              hitSlop={6}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <IconSymbol name="plus" size={14} color={theme.primaryForeground} weight="semibold" />
              <Text style={[styles.primaryButtonLabel, { color: theme.primaryForeground }]}>
                Adicionar
              </Text>
            </Pressable>
          </View>
        </View>

        {status === 'loading' ? (
          <SkeletonList />
        ) : status === 'error' ? (
          <ErrorView onRetry={retry} />
        ) : pets.length === 0 ? (
          <EmptyState
            icon="pawprint.fill"
            title="Nenhum pet ainda"
            description="Cadastre seu primeiro pet para começar a registrar vacinas e cuidados."
            actionLabel="Adicionar pet"
            actionAccessibilityLabel="Adicionar primeiro pet"
            onAction={goToCreate}
          />
        ) : (
          <FlatList
            data={pets}
            keyExtractor={(p) => String(p.id)}
            ListHeaderComponent={
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>
                  Nome · Espécie · Idade
                </Text>
                <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>
                  {pets.length.toString().padStart(2, '0')}
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <PetRow
                pet={item}
                onPress={() => goToDetail(item.id)}
                onLongPress={() => sheetRef.current?.present(item)}
                isFirst={index === 0}
                isLast={index === pets.length - 1}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.foreground}
              />
            }
            ListFooterComponent={
              <View accessible={false} style={styles.listFooter}>
                <Text style={[styles.listFooterText, { color: theme.mutedForeground }]}>
                  Mantenha pressionado para mais ações
                </Text>
              </View>
            }
          />
        )}

        <PetActionsSheet ref={sheetRef} onEdit={handleEdit} onDelete={handleDelete} />
      </SafeAreaView>
    );
  }

  function PetRow({
    pet,
    onPress,
    onLongPress,
    isFirst,
    isLast,
  }: {
    pet: Pet;
    onPress: () => void;
    onLongPress: () => void;
    isFirst: boolean;
    isLast: boolean;
  }) {
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];
    const meta = formatPetMeta(pet.species, pet.birth_date);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${pet.name}, ${meta}`}
        accessibilityHint="Toque para abrir os detalhes, segure para opções"
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? theme.accent : theme.card,
            borderColor: theme.border,
            borderTopWidth: isFirst ? StyleSheet.hairlineWidth : 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderRightWidth: StyleSheet.hairlineWidth,
            borderTopLeftRadius: isFirst ? 12 : 0,
            borderTopRightRadius: isFirst ? 12 : 0,
            borderBottomLeftRadius: isLast ? 12 : 0,
            borderBottomRightRadius: isLast ? 12 : 0,
          },
        ]}
      >
        <Avatar name={pet.name} size="md" />
        <View style={styles.rowText}>
          <Text style={[styles.rowName, { color: theme.foreground }]} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={[styles.rowMeta, { color: theme.mutedForeground }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <IconSymbol name="chevron.right" size={16} color={theme.mutedForeground} />
      </Pressable>
    );
  }

  function SkeletonList() {
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];
    const shimmer = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(shimmer, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [shimmer]);

    return (
      <View style={styles.listContent}>
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>Carregando…</Text>
          <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>—</Text>
        </View>
        <View
          style={[styles.skeletonCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.skeletonRow,
                {
                  borderBottomColor: theme.border,
                  borderBottomWidth: i === 2 ? 0 : StyleSheet.hairlineWidth,
                  opacity: shimmer,
                },
              ]}
            >
              <View style={[styles.skeletonAvatar, { backgroundColor: theme.muted }]} />
              <View style={styles.skeletonLines}>
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineWide,
                    { backgroundColor: theme.muted },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineNarrow,
                    { backgroundColor: theme.muted },
                  ]}
                />
              </View>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  }

  function ErrorView({ onRetry }: { onRetry: () => void }) {
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];

    return (
      <View style={styles.errorContainer}>
        <View
          style={[
            styles.errorMedallion,
            {
              backgroundColor: theme.destructiveSurface,
              borderColor: theme.destructiveBorder,
            },
          ]}
        >
          <IconSymbol name="alert-triangle" size={22} color={theme.destructive} />
        </View>
        <Text style={[styles.errorTitle, { color: theme.foreground }]}>
          Não foi possível carregar
        </Text>
        <Text style={[styles.errorDesc, { color: theme.mutedForeground }]}>
          Verifique a conexão e tente novamente. Seus dados continuam salvos no aparelho.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: pressed ? theme.accent : theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <IconSymbol name="refresh-cw" size={14} color={theme.foreground} />
          <Text style={[styles.secondaryButtonLabel, { color: theme.foreground }]}>
            Tentar novamente
          </Text>
        </Pressable>
      </View>
    );
  }

  const platformRoundedTitle =
    Platform.OS !== 'android' ? FontFamilies.sans.semibold : FontFamilies.sans.bold;

  const styles = StyleSheet.create({
    screen: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 22,
      paddingTop: 16,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerText: { flex: 1, minWidth: 0 },
    headerTitle: {
      fontFamily: platformRoundedTitle,
      fontSize: 26,
      lineHeight: 30,
      letterSpacing: -0.7,
    },
    headerSubline: {
      fontFamily: FontFamilies.sans.regular,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    primaryButtonLabel: {
      fontFamily: FontFamilies.sans.medium,
      fontSize: 13,
      letterSpacing: -0.1,
    },

    listContent: {
      paddingHorizontal: 22,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    metaLabel: {
      fontFamily: FontFamilies.mono.medium,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 64,
    },
    rowText: { flex: 1, minWidth: 0 },
    rowName: {
      fontFamily: FontFamilies.sans.medium,
      fontSize: 14,
      letterSpacing: -0.1,
    },
    rowMeta: {
      fontFamily: FontFamilies.sans.regular,
      fontSize: 12,
      marginTop: 3,
    },

    listFooter: {
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingVertical: 16,
    },
    listFooterText: {
      fontFamily: FontFamilies.sans.regular,
      fontSize: 12,
    },

    skeletonCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 12,
      overflow: 'hidden',
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    skeletonAvatar: {
      width: 38,
      height: 38,
      borderRadius: 8,
    },
    skeletonLines: {
      flex: 1,
      gap: 6,
    },
    skeletonLine: {
      height: 10,
      borderRadius: 999,
    },
    skeletonLineWide: { width: '50%' },
    skeletonLineNarrow: { width: '30%' },

    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 32,
      paddingBottom: 80,
    },
    errorMedallion: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
    },
    errorTitle: {
      fontFamily: FontFamilies.sans.semibold,
      fontSize: 16,
      letterSpacing: -0.2,
      textAlign: 'center',
      marginTop: 4,
    },
    errorDesc: {
      fontFamily: FontFamilies.sans.regular,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 240,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      marginTop: 8,
    },
    secondaryButtonLabel: {
      fontFamily: FontFamilies.sans.medium,
      fontSize: 14,
      letterSpacing: -0.1,
    },
  });
  ```

  Notes worth knowing:
  - The list-card "outer container" pattern is achieved by drawing the rounded border on the first/last rows (`isFirst`/`isLast` props in `PetRow`) instead of wrapping in another `<View>`. This avoids `overflow: hidden` shenanigans + matches `FlatList`'s rendering model better.
  - `Animated` API (not Reanimated) is intentional — the shimmer is a single opacity tween, doesn't need Reanimated's worklet machinery, and is more obviously React-Compiler-safe.
  - The search ghost button is non-functional for now (`onPress` not set) — the spec marks search wiring as out of scope. We render it because the visual contract requires its presence.

- [ ] **Step 9.3: Validate**

  ```bash
  npm run typecheck && npm run lint && npx prettier --write "app/(tabs)/index.tsx" && npm run format:check
  ```

- [ ] **Step 9.4: Visual smoke check — populated state**

  With at least one pet in the DB: header shows Geist 26 px title, neutral count subline, ghost search square + black "Adicionar" pill. Meta row above the list shows uppercase mono labels. Pets render as rows inside a single rounded-border card with hairlines between. Footer text "Mantenha pressionado para mais ações" centred and muted.

- [ ] **Step 9.5: Visual smoke check — empty state**

  With zero pets: small square medallion (paw print) → "Nenhum pet ainda" → description → "Adicionar pet" button.

- [ ] **Step 9.6: Visual smoke check — loading skeleton**

  Reload the screen and watch the very first render: 3 skeleton rows inside the card with a slow opacity shimmer (1.6 s cycle).

- [ ] **Step 9.7: Visual smoke check — error state**

  Temporarily break the SQL query (e.g. typo the table name to `petss` in the SELECT) and reload. You should see: red medallion with alert-triangle, "Não foi possível carregar" title, description, secondary (bordered) retry button with refresh icon. Revert the typo afterwards.

- [ ] **Step 9.8: Visual smoke check — dark mode**

  Toggle system theme to dark. Everything inverts cleanly: zinc-950 background, white text, primary button is white with black text, list-card border is zinc-800.

- [ ] **Step 9.9: Checkpoint — wait for user approval**

  Show: `git diff "app/(tabs)/index.tsx"`. Wait for "approved".

---

## Task 10: Final verification + handoff

End-to-end smoke + summary of what changed.

- [ ] **Step 10.1: Run all gates once more**

  ```bash
  npm run typecheck && npm run lint && npm run format:check
  ```

  Expected: all exit 0.

- [ ] **Step 10.2: Restart Metro with full cache clear**

  Tell the user: `Ctrl+C` Metro if running, then `npx expo start --clear`. On emulator: fully kill the app and reopen so the fresh bundle (with new icon mapping, fonts, theme) is what runs.

- [ ] **Step 10.3: Manual verification setup — seed a pet for full testing**

  Without pets the action sheet, populated list, and pressed-row states can't be exercised. Two options:
  - **Option A (preferred):** create a dev seeder. Run:
    ```bash
    npm run make:seed:dev -- "demo pets"
    ```
    Edit the generated `lib/seeders/dev/demo-pets.ts` to `INSERT OR IGNORE` Rex/Luna/Bilbo (full code in the dev-seeder section of `lib/CLAUDE.md`). Then invoke via a temporary `runDevSeeders(db)` call somewhere accessible (or via a button in the app — out of scope here).
  - **Option B (quick & dirty):** add a one-off button in `app/(tabs)/index.tsx` that calls `db.runAsync` to insert 3 pets, exercise, then remove the button. Discouraged but faster.

- [ ] **Step 10.4: Manual checklist — exercise every state**

  Walk through and check each of these renders correctly in both light + dark mode:
  - [ ] Initial load shows the skeleton (briefly)
  - [ ] Populated list renders with 3 rows, hairlines between, rounded outer corners
  - [ ] Tapping the search button shows pressed state (no-op is fine)
  - [ ] Tapping "Adicionar" navigates (will show "screen not found" until specs 02/03 land — that's expected)
  - [ ] Long-pressing a row opens the action sheet (drag handle, preview, two actions)
  - [ ] Tapping "Editar pet" navigates (same as above)
  - [ ] Tapping "Excluir pet" → Alert → confirm → row removed → list updates
  - [ ] Deleting last pet → empty state appears with new medallion
  - [ ] Tapping empty-state CTA navigates
  - [ ] Pull to refresh shows the native spinner
  - [ ] Force an error (temporarily break SQL) → error medallion + retry button visible
  - [ ] Toggle system dark mode mid-session → all UI inverts without flicker
  - [ ] All Portuguese strings use PT-BR forms (`Cadastre`, `seu`, `Não`, accented characters intact)

- [ ] **Step 10.5: Checkpoint — final summary, wait for user approval**

  Show the user the full set of changes:

  ```bash
  git status -sb && git diff --stat
  ```

  Wait for explicit approval before any commit. Per the user's standing instruction, this plan never commits autonomously.

  When approved, commit as one logical change:

  ```bash
  git add -A
  git commit -m "$(cat <<'EOF'
  Spec 01 redesign — shadcn visual language

  Apply docs/superpowers/specs/2026-05-12-pets-list-shadcn-redesign.md to
  the Pets List implementation. Migrate Theme tokens to zinc palette,
  load Geist + Geist Mono via @expo-google-fonts, switch IconSymbol to
  lucide-react-native on all platforms, rewrite Avatar / EmptyState /
  PetActionsSheet / app/(tabs)/index.tsx to the new visual contract.
  Functional behaviour (routing, queries, accessibility) unchanged.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Risks & Plan B notes

**R1. `@expo-google-fonts/geist` or `@expo-google-fonts/geist-mono` doesn't exist on npm.**
Mitigated by Step 2.1/2.2 verifying existence first. Plan B: use `@expo-google-fonts/dev` (the meta package that exposes all Google Fonts). Same constant names work; only the import source changes.

**R2. `lucide-react-native` doesn't render on RN Web (static export).**
Lucide is built on `react-native-svg`, which has a `react-native-svg/lib/module/index.web.js` shim. If web rendering breaks, verify `react-native-svg` is the version `expo install` picked (SDK-54-compatible) and that `metro.config.js` includes `svg` in `resolver.assetExts` if it gets transformed wrongly. Plan B: write a thin platform-suffixed wrapper (`icon-symbol.web.tsx`) using inline `<svg>` JSX for the ~13 icons we use. Tedious but local.

**R3. The Animated shimmer in the skeleton degrades on React Compiler.**
The Compiler should leave `Animated.Value` refs alone (they're not state). If it complains, downgrade the skeleton to a static muted block (no animation) — visually acceptable for a brief loading state.

**R4. Geist takes too long to load on first launch → blank screen.**
The splash screen masks this; `fontsError` also unblocks render. If the user complains about a slow first paint, change the early return to render a minimal `<View>` with `backgroundColor: theme.background` instead of `null` — the splash will already be hidden by then.

**R5. NativeWind v5 preview surprises (already burned by this in the prior iteration).**
This plan uses NativeWind for **no theme-coloured properties** — only the existing `global.css` `@theme` declarations are kept for future compatibility / web parity. All runtime styling goes through `Theme[scheme]` + `StyleSheet`. No surprises possible from preview class-name resolution.

---

## Done When (mirrors the spec's acceptance criteria)

- [ ] `constants/theme.ts` exports the updated `Theme` constant matching the spec's token tables, plus a `FontFamilies` constant.
- [ ] `global.css` `@theme` block mirrors the same values.
- [ ] Geist + Geist Mono load on web and native; the app renders Geist for body text and Geist Mono for the meta-row labels.
- [ ] `components/avatar.tsx` is `rounded-md`, `muted` bg, no hashed palette.
- [ ] `components/empty-state.tsx` renders the square-medallion variant with the new tokens.
- [ ] `components/pet-actions-sheet.tsx` renders the shadcn-styled sheet (drag handle, preview row, two actions, destructive trash row).
- [ ] `app/(tabs)/index.tsx` renders header, single `list-card` with hairlines, list footer hint, skeleton, and error state per the spec.
- [ ] Lucide icons replace the existing `IconSymbol` mapping; both platform files re-export the same impl.
- [ ] Both light and dark modes render correctly; switching the system color scheme updates everything.
- [ ] `npm run lint && npm run typecheck && npm run format:check` all green.
- [ ] All user-facing strings remain PT-BR.
- [ ] No autonomous commits — every commit step waited for user approval.

Functional behaviour described in [`docs/specs/01-pets-list.md`](../../specs/01-pets-list.md) (navigation, data queries, accessibility) is unchanged.
