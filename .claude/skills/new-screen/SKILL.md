---
name: new-screen
description: Scaffold a new expo-router screen under app/ following project conventions (themed wrapper, optional tab registration, modal presentation). Sibling to /new-themed-component.
disable-model-invocation: true
---

# new-screen

Use this skill to add a new screen to `app/` so it stays consistent with the existing expo-router v6 setup. Invoked as `/new-screen <Name> [variant]`:

- `<Name>` is **PascalCase** (e.g. `PetDetail`, `Settings`, `AddVaccine`).
- `[variant]` is one of `tab` | `stack` | `modal`. Default is `stack`.

## What each variant does

| Variant           | File created             | Layout edited                                                              |
| ----------------- | ------------------------ | -------------------------------------------------------------------------- |
| `stack` (default) | `app/<kebab>.tsx`        | None — auto-routed by the root `<Stack>` in `app/_layout.tsx`              |
| `tab`             | `app/(tabs)/<kebab>.tsx` | `app/(tabs)/_layout.tsx` — append a `<Tabs.Screen>` entry                  |
| `modal`           | `app/<kebab>.tsx`        | `app/_layout.tsx` — append a `<Stack.Screen>` with `presentation: 'modal'` |

Filename conversion: PascalCase → kebab-case (`PetDetail` → `pet-detail.tsx`, `AddVaccine` → `add-vaccine.tsx`).

## Procedure

1. **Validate inputs.**
   - Reject if `<Name>` is not PascalCase.
   - Reject if the target file already exists. Don't overwrite.
   - For `tab` variant, confirm `app/(tabs)/_layout.tsx` exists; if not, fall back to `stack`.

2. **Pick the tab icon (tab variant only).**
   The project uses `<IconSymbol name="...">` from `components/ui/icon-symbol.tsx`. The `MAPPING` object there is the source of truth — only the keys present there will render on Android/web. Ask the user which key to use, or use a generic existing one (`house.fill` is already mapped). If they want a new icon, instruct them to add it to `MAPPING` first (mention `components/ui/icon-symbol.tsx:16`).

3. **Generate the screen file.** Substitute `{{ComponentName}}` and `{{Title}}` (Title-cased version of the name).

   ### Template — `stack` and `modal` variants

   ```tsx
   import { StyleSheet } from 'react-native';

   import { ThemedText } from '@/components/themed-text';
   import { ThemedView } from '@/components/themed-view';

   export default function {{ComponentName}}Screen() {
     return (
       <ThemedView style={styles.container}>
         <ThemedText type="title">{{Title}}</ThemedText>
       </ThemedView>
     );
   }

   const styles = StyleSheet.create({
     container: {
       flex: 1,
       padding: 16,
     },
   });
   ```

   ### Template — `tab` variant

   Same as above, but the file lives under `app/(tabs)/` so the tab layout will register it.

4. **Wire up the layout (variant-specific).**

   ### Tab variant

   Open `app/(tabs)/_layout.tsx`. Inside the `<Tabs>` element, append (immediately before the closing `</Tabs>`):

   ```tsx
   <Tabs.Screen
     name="<kebab-without-extension>"
     options={{
       title: '{{Title}}',
       tabBarIcon: ({ color }) => <IconSymbol size={28} name="<chosen-icon>" color={color} />,
     }}
   />
   ```

   `IconSymbol` and `Tabs` are already imported in that file — do not add duplicate imports.

   ### Modal variant

   Open `app/_layout.tsx`. Inside the `<Stack>` element, append:

   ```tsx
   <Stack.Screen
     name="<kebab-without-extension>"
     options={{ presentation: 'modal', title: '{{Title}}' }}
   />
   ```

   Look at the existing `<Stack.Screen name="modal" ...>` entry as a reference — match its style.

   ### Stack variant

   No layout edit required. The root `<Stack>` auto-discovers any `app/*.tsx` sibling. Skip this step.

5. **Restart hint.**
   Typed routes are enabled (`app.json` → `experiments.typedRoutes`). After creating a new route, the dev server must regenerate types in `.expo/types/` for `<Link href="...">` to type-check the new path. Tell the user: _"Restart the dev server (`npm start`) so typed routes regenerate."_

6. **Report.** Output:
   - File path created.
   - Variant used.
   - Whether a layout file was edited (and which one).
   - Restart hint.

## When _not_ to use this skill

- For a reusable UI piece (Card, Header, etc.) — use `/new-themed-component` instead. Anything under `app/` becomes a route; reusable pieces belong in `components/`.
- For nested navigators (a stack inside a tab) — those need a `<segment>/_layout.tsx` setup that this skill does not generate. Ask the user to confirm the structure manually.
