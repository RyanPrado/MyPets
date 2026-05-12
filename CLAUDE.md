# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — start the Expo dev server (Metro bundler + QR code for Expo Go)
- `npm run android` / `npm run ios` / `npm run web` — start dev server targeting a specific platform
- `npm run lint` — `expo lint` (uses `eslint.config.js` with `eslint-config-expo` + `eslint-config-prettier`)
- `npm run format` / `npm run format:check` — Prettier write / check
- `npm run typecheck` — `tsc --noEmit`
- `npm run make:migration -- "<description>"` — scaffold a new SQLite migration (see `lib/CLAUDE.md`)
- `npm run make:seed:init -- "<description>"` — scaffold a new init seeder (auto-runs on every app start, tracked)
- `npm run make:seed:dev -- "<description>"` — scaffold a new dev seeder (manually invoked, must be idempotent)
- `npm run reset-project` — **destructive**: moves `app/`, `components/`, `hooks/`, `constants/`, `scripts/` into `app-example/` and scaffolds a blank `app/`. Only run when intentionally restarting from scratch.

There is no test runner configured. Husky + lint-staged run ESLint and Prettier on staged files at commit time.

## Stack & runtime constraints

- **Expo SDK 54**, React 19, React Native 0.81 — bleeding-edge versions; verify API shapes against current docs (e.g. via context7) rather than relying on memory.
- **New Architecture is enabled** (`app.json` → `newArchEnabled: true`). Avoid libraries that don't support Fabric/TurboModules.
- **React Compiler is enabled** as an experiment (`experiments.reactCompiler`). Don't manually `useMemo`/`useCallback` for the compiler's sake — and be aware that violating Rules of React (mutation, conditional hooks) will break compilation, not just lint.
- **Typed routes are enabled** (`experiments.typedRoutes`) — `expo-router` generates types in `.expo/types/`. After adding/renaming a route file, restart the dev server so types regenerate.
- **TypeScript is strict** with `@/*` path alias mapped to the project root (e.g. `@/hooks/use-theme-color`).

## Architecture

### Routing (expo-router v6, file-based)

`app/` is the route tree. `app/_layout.tsx` is the root layout that wires the navigation theme to the system color scheme and registers two top-level routes: `(tabs)` (group, no URL segment) and `modal` (presented as a modal). The tab bar lives in `app/(tabs)/_layout.tsx`. Adding a new screen = adding a `.tsx` file under `app/`; adding a new tab = adding a `<Tabs.Screen>` entry in the tabs layout plus the corresponding file.

### Theming

Colors are centralized in `constants/theme.ts` as a `Colors` object keyed by `light`/`dark`. Components consume colors through the `useThemeColor` hook (`hooks/use-theme-color.ts`), which lets callers override per-mode via `lightColor`/`darkColor` props and otherwise falls back to a named token from `Colors`. **Do not hard-code colors in components** — extend `Colors` and read via `useThemeColor`, or use `ThemedText`/`ThemedView` which already encapsulate this. `ThemedText` also defines a small set of typographic variants (`default`, `title`, `defaultSemiBold`, `subtitle`, `link`) — prefer the `type` prop over redefining text styles.

### Cross-platform code

This app targets iOS, Android, **and web** (`app.json` → `web.output: "static"`, so static export must keep working). Platform-specific implementations use Metro's filename suffixes:

- `use-color-scheme.ts` (default) vs `use-color-scheme.web.ts` (web variant that defers to client hydration to avoid SSR mismatch).
- `icon-symbol.ios.tsx` (native SF Symbols) vs `icon-symbol.tsx` (MaterialIcons fallback for Android/web).

When adding a new icon, you must add an entry to the `MAPPING` object in `components/ui/icon-symbol.tsx` translating the SF Symbol name to a MaterialIcons name, otherwise non-iOS platforms will render nothing.

### Persistence

Local persistence goes through `expo-sqlite`. The data layer lives under `lib/` with file-per-migration auto-discovery, init/dev seeders, and tracking tables (`app_migrations`, `app_seeders`). **Read `lib/CLAUDE.md` before touching anything under `lib/`** — it documents the conventions, the critical "never edit a committed migration" rule, and the `db-types.ts` ↔ schema contract that has no automatic enforcement. Do not introduce a second storage library without a clear reason.
