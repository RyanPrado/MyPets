---
name: new-themed-component
description: Scaffold a new themed React Native component under components/ following the project's themed-text/themed-view convention (kebab-case file, PascalCase export, useThemeColor for colors, optional lightColor/darkColor overrides).
disable-model-invocation: true
---

# new-themed-component

Use this skill to add a new themed component to `components/` so it stays consistent with `themed-text.tsx` and `themed-view.tsx`. The user invokes it as `/new-themed-component <ComponentName> [primitive]` where:

- `<ComponentName>` is **PascalCase** (e.g. `Card`, `Banner`, `SectionHeader`).
- `[primitive]` is optional and one of: `View` (default), `Text`, `Pressable`, `ScrollView`. It's the underlying React Native primitive the component wraps.

## What to do

1. **Resolve the file path.**
   Convert the PascalCase name to kebab-case for the filename. Examples:
   - `Card` → `components/card.tsx`
   - `SectionHeader` → `components/section-header.tsx`
   - `BannerCTA` → `components/banner-cta.tsx`

   If the target file already exists, stop and tell the user — do not overwrite.

2. **Pick the color token.**
   The `useThemeColor` hook in `hooks/use-theme-color.ts` accepts a `colorName` that must be a key shared by `Colors.light` and `Colors.dark` in `constants/theme.ts`. The current shared keys are:
   `text`, `background`, `tint`, `icon`, `tabIconDefault`, `tabIconSelected`.

   Default to `background` for `View`/`Pressable`/`ScrollView` wrappers and `text` for `Text` wrappers. If the user wants a different token, ask once, then proceed.

3. **Generate the file** using the template below, substituting:
   - `{{ComponentName}}` — the PascalCase name
   - `{{Primitive}}` — `View` | `Text` | `Pressable` | `ScrollView`
   - `{{StyleType}}` — `ViewStyle` for non-text primitives, `TextStyle` for `Text`
   - `{{ColorToken}}` — the resolved color token name (e.g. `'background'`)
   - `{{StyleProp}}` — `backgroundColor` for non-text primitives, `color` for `Text`

   ### Template

   ```tsx
   import { {{Primitive}}, type {{Primitive}}Props } from 'react-native';

   import { useThemeColor } from '@/hooks/use-theme-color';

   export type {{ComponentName}}Props = {{Primitive}}Props & {
     lightColor?: string;
     darkColor?: string;
   };

   export function {{ComponentName}}({
     style,
     lightColor,
     darkColor,
     ...rest
   }: {{ComponentName}}Props) {
     const themed = useThemeColor({ light: lightColor, dark: darkColor }, {{ColorToken}});

     return <{{Primitive}} style={[{ {{StyleProp}}: themed }, style]} {...rest} />;
   }
   ```

4. **Do not** add a `StyleSheet.create` block, default styling beyond the themed color, or test files. Keep the component minimal — additional styling is the caller's job, mirroring how `ThemedView` is written.

5. **After writing**, report:
   - The created file path.
   - The chosen primitive and color token.
   - A one-line example of how to use it (e.g. `<Card lightColor="#FAFAFA"><ThemedText>Hello</ThemedText></Card>`).

## When _not_ to use this skill

- For text components specifically — use `ThemedText` (which already encodes typographic variants) instead of generating a thin wrapper.
- For interactive controls that need haptics — extend `HapticTab` (`components/haptic-tab.tsx`) instead of starting from scratch.
- For full screens — those belong under `app/`, not `components/`, and use `expo-router` file-based routing.
