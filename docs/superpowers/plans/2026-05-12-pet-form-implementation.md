# Pet Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Pet Form modal screen (create + edit) per the design at `docs/superpowers/specs/2026-05-12-pet-form-design.md` and the functional contract at `docs/specs/02-pet-form.md`.

**Architecture:** Token / typography / icon system / press states / bottom-sheet chrome were already established by Spec 01's shadcn redesign — this plan reuses them as-is. New primitives (`Input`, `PhotoUploadCircle`, `SpeciesPickerSheet`) are built leaf-first, then the screen wires them together. The screen handles its own state, validation, photo-picker flow, and DB I/O — no external state library introduced.

**Tech Stack:** Same as Spec 01 (Expo SDK 54, RN 0.81, React 19, React Compiler, TypeScript strict). New runtime touches: `expo-image-picker` (already in `package.json` at `~17.0.11`, just needs `app.json` plugin config), `@gorhom/bottom-sheet`'s `BottomSheetFlatList` (the package is installed; we just haven't used the FlatList variant yet).

**Testing model:** No Jest. Verification per task = `npm run lint && npm run typecheck && npm run format:check` plus targeted manual checks on the emulator. The user runs the emulator and approves visually before each commit. **The plan does NOT commit autonomously** — every commit step says "wait for user approval".

**Working directory:** `C:\Users\ryanp\Projetos\Faculdade\MyPets\.claude\worktrees\spec-02-pet-form`. Use the Bash tool (POSIX) — PowerShell-specific syntax noted where relevant.

**Spec references:**

- Functional contract: [`docs/specs/02-pet-form.md`](../../specs/02-pet-form.md)
- Visual contract: [`docs/superpowers/specs/2026-05-12-pet-form-design.md`](../specs/2026-05-12-pet-form-design.md)
- Inherited visual language: [`docs/superpowers/specs/2026-05-12-pets-list-shadcn-redesign.md`](../specs/2026-05-12-pets-list-shadcn-redesign.md)

---

## File Structure

| File                                  | Action | Responsibility                                                                                                                  |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui/icon-symbol.tsx`       | Modify | Add 4 entries to MAPPING: `chevron.down`, `checkmark`, `photo.fill`, `camera.fill`                                              |
| `app.json`                            | Modify | Add `expo-image-picker` to `plugins` array with PT-BR permissions strings                                                       |
| `components/form/input.tsx`           | Create | Reusable input primitive (label + container + text input / pressable + helper/error). Used by Pet Form and future Vaccine Form. |
| `components/photo-upload-circle.tsx`  | Create | 88 px circular photo widget with dashed-border placeholder, image fill, primary-tinted camera badge, long-press remove flow.    |
| `components/species-picker-sheet.tsx` | Create | `forwardRef` bottom-sheet wrapping `BottomSheetFlatList` of the 15 species. Inherits chrome from `PetActionsSheet`.             |
| `app/pet-form.tsx`                    | Create | The modal screen — header, layout, state, validation, dd/mm/aaaa ↔ ISO conversion, `INSERT`/`UPDATE`, image-picker flow.        |
| `app/_layout.tsx`                     | Modify | Register `pet-form` Stack screen with `presentation: 'modal'`, `headerShown: false`                                             |

Files **not** touched: `lib/migrations/*`, `lib/db-types.ts`, `lib/constants/species.ts`, `lib/pet-meta.ts`, `constants/theme.ts`, `global.css`, all spec-01 components (`avatar.tsx`, `empty-state.tsx`, `pet-actions-sheet.tsx`, `app/(tabs)/index.tsx`).

---

## Pre-Flight Checklist

- [ ] **Step P.1: Verify worktree state**

  Run: `git status -sb && git log -1 --oneline`
  Expected: branch `worktree-spec-02-pet-form`, working tree clean, HEAD at `4b71173 chore: ignore .claude/worktrees/`.

- [ ] **Step P.2: Verify baseline green**

  Run sequentially:

  ```bash
  npm run typecheck
  npm run lint
  npm run format:check
  ```

  Expected: all three exit 0.

- [ ] **Step P.3: Verify expo-image-picker is installed**

  Run: `node -e "console.log(require('./node_modules/expo-image-picker/package.json').version)"`
  Expected: prints a semver (SDK-54-compatible, around `~17.0.11`). If `Cannot find module`, run `npx expo install expo-image-picker` before continuing.

- [ ] **Step P.4: Verify the inherited spec files are reachable**

  Run: `ls docs/specs/02-pet-form.md docs/superpowers/specs/2026-05-12-pet-form-design.md docs/superpowers/specs/2026-05-12-pets-list-shadcn-redesign.md`
  Expected: all three listed (no errors).

---

## Task 1: Add the 4 new icon MAPPING entries

The icon registry has to know about the new symbol names before any component that uses them can compile-clean.

**Files:**

- Modify: `components/ui/icon-symbol.tsx`

- [ ] **Step 1.1: Read the current file**

  Run: read `components/ui/icon-symbol.tsx` so the next edit has the import list and MAPPING block in context.

- [ ] **Step 1.2: Add lucide imports for the four new icons**

  In the import block from `lucide-react-native`, add `Camera`, `Check`, `ChevronDown`, and `Image as ImageIcon`. The alphabetised result should look like:

  ```tsx
  import {
    AlertTriangle,
    Camera,
    Check,
    ChevronDown,
    ChevronRight,
    Code2,
    Compass,
    Home,
    Image as ImageIcon,
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
  ```

  The `Image as ImageIcon` alias is **required** — `Image` would clash with React Native's `Image` component when this module is imported into screens that also use `<Image>`.

- [ ] **Step 1.3: Add the four entries to MAPPING**

  At the end of the `MAPPING` object, after `compass: Compass,`, append a new "// pet form additions" section so it reads:

  ```tsx
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
    // pet form additions
    'chevron.down': ChevronDown,
    checkmark: Check,
    'photo.fill': ImageIcon,
    'camera.fill': Camera,
  };
  ```

- [ ] **Step 1.4: Validate**

  Run:

  ```bash
  npm run typecheck && npm run lint && npx prettier --write components/ui/icon-symbol.tsx && npm run format:check
  ```

  Expected: all green. Typecheck must pass because the new MAPPING keys are additions — no existing key is renamed.

- [ ] **Step 1.5: Checkpoint — wait for user approval**

  Show: `git diff components/ui/icon-symbol.tsx`. Do NOT commit. Wait for user "approved" before Task 2.

---

## Task 2: Configure `expo-image-picker` in `app.json`

Adds the plugin so the prebuild step (or Expo Go) knows about the iOS / Android permissions and renders the right prompts.

**Files:**

- Modify: `app.json`

- [ ] **Step 2.1: Read the current `app.json`**

  Run: read `app.json` so the next edit lands in the correct `plugins` array position.

- [ ] **Step 2.2: Add the plugin entry**

  In the `plugins` array (currently `["expo-router", ["expo-splash-screen", {...}], "expo-sqlite"]`), append the image-picker entry. After the edit, the array looks like:

  ```json
  "plugins": [
    "expo-router",
    [
      "expo-splash-screen",
      {
        "image": "./assets/images/splash-icon.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#ffffff",
        "dark": {
          "backgroundColor": "#000000"
        }
      }
    ],
    "expo-sqlite",
    [
      "expo-image-picker",
      {
        "photosPermission": "Permite acesso para escolher uma foto do seu pet.",
        "cameraPermission": "Permite acesso à câmera para fotografar seu pet."
      }
    ]
  ]
  ```

  Both permission strings are PT-BR (you/seu, with accent). They appear in iOS's native permission alert.

- [ ] **Step 2.3: Validate**

  Run:

  ```bash
  npx prettier --write app.json && npm run format:check
  ```

  No typecheck / lint changes for a JSON edit. Format must be clean.

- [ ] **Step 2.4: Note for the user**

  Output to the user: this change requires either (a) a new dev-client build (`npx expo prebuild`) or (b) running in Expo Go which honours the permission strings at runtime. **Do not run `prebuild` autonomously** — it's a destructive operation that rewrites the iOS/Android native projects. The user runs it themselves if needed; for Expo Go testing, no rebuild is required.

- [ ] **Step 2.5: Checkpoint — wait for user approval**

  Show: `git diff app.json`. Wait for "approved".

---

## Task 3: `Input` primitive

The reusable input component is built first because all three field slots (Name, Species, Birth date) and the future Vaccine Form will consume it.

**Files:**

- Create: `components/form/input.tsx`

- [ ] **Step 3.1: Verify the `components/form/` directory exists or create it**

  Run: `ls components/form 2>&1 || mkdir -p components/form`
  Either prints the directory listing (likely empty / doesn't exist), or creates it silently.

- [ ] **Step 3.2: Write `components/form/input.tsx`**

  Create the file with this exact content:

  ```tsx
  import { forwardRef, useState } from 'react';
  import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    type TextInputProps,
    View,
    type ViewStyle,
  } from 'react-native';

  import { FontFamilies, Theme } from '@/constants/theme';
  import { useColorScheme } from '@/hooks/use-color-scheme';

  export type InputProps = Omit<TextInputProps, 'style' | 'onFocus' | 'onBlur'> & {
    label: string;
    helperText?: string;
    errorText?: string;
    disabled?: boolean;
    trailing?: React.ReactNode;
    /** When set, the component renders as a Pressable (used for the species picker surrogate). */
    onPress?: () => void;
    /** Value to display when rendering as a Pressable; falls back to `placeholder` if empty. */
    displayValue?: string;
    /** Used when rendering as a Pressable so accessibility tools announce the dropdown role. */
    accessibilityRole?: 'combobox' | 'button';
  };

  export const Input = forwardRef<TextInput, InputProps>(function Input(
    {
      label,
      helperText,
      errorText,
      disabled,
      trailing,
      onPress,
      displayValue,
      accessibilityRole,
      accessibilityLabel,
      accessibilityValue,
      placeholder,
      value,
      onChangeText,
      ...rest
    },
    ref
  ) {
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];
    const [focused, setFocused] = useState(false);

    const hasError = !!errorText;
    const borderColor = hasError ? theme.destructive : focused ? theme.foreground : theme.border;
    const borderWidth = focused || hasError ? 1.5 : StyleSheet.hairlineWidth * 2;

    const containerStyle: ViewStyle = {
      backgroundColor: theme.card,
      borderColor,
      borderWidth,
      borderRadius: 8,
      height: 40,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      opacity: disabled ? 0.6 : 1,
    };

    const helperColor = hasError ? theme.destructive : theme.mutedForeground;
    const helperContent = errorText ?? helperText;

    return (
      <View style={{ opacity: disabled ? 0.85 : 1 }}>
        <Text
          style={[
            styles.label,
            { color: theme.mutedForeground, fontFamily: FontFamilies.mono.medium },
          ]}
        >
          {label}
        </Text>

        {onPress ? (
          <Pressable
            accessibilityRole={accessibilityRole ?? 'button'}
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityValue={accessibilityValue}
            accessibilityState={{ disabled }}
            onPress={disabled ? undefined : onPress}
            style={({ pressed }) => [
              containerStyle,
              { backgroundColor: pressed ? theme.accent : theme.card },
            ]}
          >
            <Text
              style={[
                styles.value,
                {
                  color: displayValue ? theme.foreground : theme.mutedForeground,
                  fontFamily: FontFamilies.sans.regular,
                },
              ]}
              numberOfLines={1}
            >
              {displayValue || placeholder || ''}
            </Text>
            {trailing}
          </Pressable>
        ) : (
          <View style={containerStyle} pointerEvents={disabled ? 'none' : 'auto'}>
            <TextInput
              ref={ref}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={theme.mutedForeground}
              selectionColor={theme.foreground}
              accessibilityLabel={accessibilityLabel ?? label}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={[
                styles.input,
                {
                  color: theme.foreground,
                  fontFamily: FontFamilies.sans.regular,
                  // RN web renders an outline by default on focus; flatten it
                  ...Platform.select({ web: { outlineStyle: 'none' } as any, default: null }),
                },
              ]}
              {...rest}
            />
            {trailing}
          </View>
        )}

        {helperContent ? (
          <Text style={[styles.helper, { color: helperColor }]}>{helperContent}</Text>
        ) : null}
      </View>
    );
  });

  const styles = StyleSheet.create({
    label: {
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    input: {
      flex: 1,
      height: 40,
      fontSize: 14,
      padding: 0,
      margin: 0,
      includeFontPadding: false,
    },
    value: {
      flex: 1,
      fontSize: 14,
    },
    helper: {
      fontSize: 12,
      lineHeight: 16,
      marginTop: 6,
    },
  });
  ```

  Why some specific choices:
  - `forwardRef` so a parent can call `.focus()` programmatically (needed for the auto-advance from "Nome" to the species picker when the user hits Return).
  - The Pressable variant is rendered with **the same `containerStyle`** as the TextInput variant — visual parity is critical, otherwise the picker surrogate would look like a different element.
  - `outlineStyle: 'none'` only on web — without it, the browser draws its blue focus ring on top of our border, which clashes.
  - `pointerEvents: disabled ? 'none' : 'auto'` on the TextInput's parent (not on the TextInput itself) so disabled-form-during-submit blocks taps.
  - `accessibilityState={{ disabled }}` on the Pressable so screen readers announce the disabled state.

- [ ] **Step 3.3: Validate**

  Run:

  ```bash
  npm run typecheck && npm run lint && npx prettier --write components/form/input.tsx && npm run format:check
  ```

  Expected: all green.

- [ ] **Step 3.4: Checkpoint — wait for user approval**

  Show: `git status components/form/input.tsx` (untracked) and `wc -l components/form/input.tsx`. The file is new, not yet tracked — no `git diff` to show. Wait for "approved".

---

## Task 4: `PhotoUploadCircle`

The 88 px circular widget with placeholder, image fill, camera badge, and long-press-to-remove. Wraps the `expo-image-picker` flow.

**Files:**

- Create: `components/photo-upload-circle.tsx`

- [ ] **Step 4.1: Write `components/photo-upload-circle.tsx`**

  Create the file with this exact content:

  ```tsx
  import * as ImagePicker from 'expo-image-picker';
  import { useState } from 'react';
  import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

  import { IconSymbol } from '@/components/ui/icon-symbol';
  import { FontFamilies, Theme } from '@/constants/theme';
  import { useColorScheme } from '@/hooks/use-color-scheme';

  export type PhotoUploadCircleProps = {
    uri: string | null;
    onChange: (uri: string | null) => void;
    size?: number;
  };

  export function PhotoUploadCircle({ uri, onChange, size = 88 }: PhotoUploadCircleProps) {
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];
    const [working, setWorking] = useState(false);

    const pick = async () => {
      if (working) return;
      setWorking(true);
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Permissão necessária',
            'Ative o acesso a fotos nas configurações para escolher uma imagem.'
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          onChange(result.assets[0].uri);
        }
      } catch (err) {
        console.warn('Image picker failed', err);
      } finally {
        setWorking(false);
      }
    };

    const confirmRemove = () => {
      if (!uri) return;
      Alert.alert('Remover foto?', 'A foto será removida deste pet.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => onChange(null) },
      ]);
    };

    const badgeSize = Math.round(size * 0.32); // ~28 for size=88
    const badgeIconSize = Math.round(badgeSize * 0.5); // ~14

    return (
      <View style={{ alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uri ? 'Alterar foto do pet' : 'Adicionar foto do pet'}
          onPress={pick}
          onLongPress={uri ? confirmRemove : undefined}
          delayLongPress={400}
          style={({ pressed }) => [
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: pressed ? 0.85 : 1,
              borderColor: uri ? 'transparent' : theme.border,
              borderStyle: uri ? 'solid' : 'dashed',
              borderWidth: uri ? 0 : 1.5,
              backgroundColor: uri ? theme.muted : theme.background,
            },
          ]}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={{ width: size, height: size, borderRadius: size / 2 }}
              resizeMode="cover"
            />
          ) : (
            <IconSymbol
              name="pawprint.fill"
              size={Math.round(size * 0.36)}
              color={theme.mutedForeground}
              weight="regular"
            />
          )}

          <View
            accessible={false}
            style={[
              styles.badge,
              {
                width: badgeSize,
                height: badgeSize,
                borderRadius: badgeSize / 2,
                backgroundColor: theme.primary,
                borderColor: theme.background,
                bottom: -2,
                right: -2,
              },
            ]}
          >
            <IconSymbol
              name="camera.fill"
              size={badgeIconSize}
              color={theme.primaryForeground}
              weight="semibold"
            />
          </View>
        </Pressable>

        <Text
          style={[styles.caption, { color: theme.mutedForeground }]}
          accessibilityElementsHidden
        >
          {uri ? 'Toque para alterar foto' : 'Toque para escolher foto'}
        </Text>
      </View>
    );
  }

  const styles = StyleSheet.create({
    circle: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    caption: {
      fontFamily: FontFamilies.sans.regular,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 8,
      textAlign: 'center',
    },
  });
  ```

  Notes:
  - `MediaTypeOptions.Images` is the v17-stable API; if a future SDK deprecates it, switch to `["images"]` array literal.
  - `quality: 0.8` keeps file sizes reasonable for local SQLite storage without visible artefacts.
  - Long-press only when there's something to remove — guards the `Alert`.
  - Badge `borderWidth: 2` and `borderColor: theme.background` produce the "cut-out" effect at the circle edge.
  - The caption is hidden from accessibility (the Pressable's `accessibilityLabel` already conveys the action).

- [ ] **Step 4.2: Validate**

  Run:

  ```bash
  npm run typecheck && npm run lint && npx prettier --write components/photo-upload-circle.tsx && npm run format:check
  ```

  Expected: all green.

  Common gotcha: if typecheck complains about `MediaTypeOptions` being deprecated, follow the suggestion in the error (likely change to `mediaTypes: ['images']`). The current `~17.0.11` SDK supports both forms.

- [ ] **Step 4.3: Checkpoint — wait for user approval**

  Show: `wc -l components/photo-upload-circle.tsx`. Wait for "approved".

---

## Task 5: `SpeciesPickerSheet`

Bottom sheet with the 15 species, inheriting chrome from `PetActionsSheet`. Uses `BottomSheetFlatList` for performant scrolling.

**Files:**

- Create: `components/species-picker-sheet.tsx`

- [ ] **Step 5.1: Write `components/species-picker-sheet.tsx`**

  Create the file with this exact content:

  ```tsx
  import {
    BottomSheetBackdrop,
    type BottomSheetBackdropProps,
    BottomSheetFlatList,
    BottomSheetModal,
  } from '@gorhom/bottom-sheet';
  import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
  import { Pressable, StyleSheet, Text, View } from 'react-native';

  import { IconSymbol } from '@/components/ui/icon-symbol';
  import { FontFamilies, Theme } from '@/constants/theme';
  import { useColorScheme } from '@/hooks/use-color-scheme';
  import { SPECIES, type Species } from '@/lib/constants/species';

  export type SpeciesPickerSheetRef = {
    present: () => void;
    dismiss: () => void;
  };

  export type SpeciesPickerSheetProps = {
    value: Species | null;
    onChange: (next: Species) => void;
  };

  export const SpeciesPickerSheet = forwardRef<SpeciesPickerSheetRef, SpeciesPickerSheetProps>(
    function SpeciesPickerSheet({ value, onChange }, ref) {
      const modalRef = useRef<BottomSheetModal>(null);
      const scheme = useColorScheme() ?? 'light';
      const theme = Theme[scheme];

      useImperativeHandle(
        ref,
        () => ({
          present() {
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

      const handleSelect = useCallback(
        (next: Species) => {
          onChange(next);
          modalRef.current?.dismiss();
        },
        [onChange]
      );

      const renderItem = useCallback(
        ({ item, index }: { item: Species; index: number }) => {
          const selected = item === value;
          const isLast = index === SPECIES.length - 1;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item}
              accessibilityState={{ selected }}
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  borderBottomColor: theme.border,
                  borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                  backgroundColor: pressed ? theme.accent : 'transparent',
                },
              ]}
            >
              <Text style={[styles.rowLabel, { color: theme.foreground }]} numberOfLines={1}>
                {item}
              </Text>
              {selected ? (
                <IconSymbol name="checkmark" size={18} color={theme.primary} weight="semibold" />
              ) : null}
            </Pressable>
          );
        },
        [handleSelect, theme.accent, theme.border, theme.foreground, theme.primary, value]
      );

      return (
        <BottomSheetModal
          ref={modalRef}
          snapPoints={['60%']}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: theme.card, borderRadius: 16 }}
          handleComponent={() => (
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
            </View>
          )}
        >
          <View style={[styles.titleRow, { borderBottomColor: theme.border }]}>
            <Text
              style={[
                styles.title,
                { color: theme.mutedForeground, fontFamily: FontFamilies.mono.medium },
              ]}
            >
              ESPÉCIE
            </Text>
          </View>

          <BottomSheetFlatList
            data={SPECIES as unknown as Species[]}
            keyExtractor={(s) => s}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
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
    titleRow: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    listContent: {
      paddingBottom: 24,
    },
    row: {
      minHeight: 48,
      paddingHorizontal: 20,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowLabel: {
      fontFamily: FontFamilies.sans.medium,
      fontSize: 14,
      letterSpacing: -0.1,
      flex: 1,
    },
  });
  ```

  Notes:
  - `snapPoints={['60%']}` caps the sheet at 60 % of screen so the form stays partially visible behind the scrim (gives the user spatial context).
  - The `as unknown as Species[]` cast on `SPECIES` is needed because `SPECIES` is a `readonly` tuple from `as const` and `BottomSheetFlatList.data` wants a mutable array type. Functionally a no-op.
  - The `present()` method is parameter-less (no need to pass the current value — the consumer keeps the value in its own state and passes it as a prop).
  - Selection dismisses the sheet via the `handleSelect` callback.

- [ ] **Step 5.2: Validate**

  Run:

  ```bash
  npm run typecheck && npm run lint && npx prettier --write components/species-picker-sheet.tsx && npm run format:check
  ```

  Expected: all green.

- [ ] **Step 5.3: Checkpoint — wait for user approval**

  Show: `wc -l components/species-picker-sheet.tsx`. Wait for "approved".

---

## Task 6: `app/pet-form.tsx` — the screen

The largest task. Renders the modal screen, manages form state, handles validation, runs the SELECT (edit mode) and INSERT/UPDATE (submit), wires the photo picker and species sheet. Broken into bite-sized sub-steps.

**Files:**

- Create: `app/pet-form.tsx`

- [ ] **Step 6.1: Create the file with the screen scaffold**

  Write the initial structure — imports, the `pet-form` default export, basic layout, header, KeyboardAvoidingView + ScrollView, all three input slots wired to placeholder local state. No DB I/O yet; submit is a no-op. This is to verify the layout renders before piling on logic.

  Write `app/pet-form.tsx` with this content:

  ```tsx
  import { router, useLocalSearchParams } from 'expo-router';
  import { useCallback, useEffect, useRef, useState } from 'react';
  import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    type TextInput,
    View,
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';

  import { Input } from '@/components/form/input';
  import { PhotoUploadCircle } from '@/components/photo-upload-circle';
  import {
    SpeciesPickerSheet,
    type SpeciesPickerSheetRef,
  } from '@/components/species-picker-sheet';
  import { IconSymbol } from '@/components/ui/icon-symbol';
  import { FontFamilies, Theme } from '@/constants/theme';
  import { useColorScheme } from '@/hooks/use-color-scheme';
  import { type Species } from '@/lib/constants/species';
  import { useSQLiteContext } from '@/lib/db';
  import type { Pet } from '@/lib/db-types';

  type FormState = {
    name: string;
    species: Species | null;
    birthDateInput: string; // dd/mm/aaaa as typed
    photoUri: string | null;
  };

  type Mode = 'create' | 'edit';

  type Status = 'idle' | 'loading' | 'submitting';

  const EMPTY_FORM: FormState = {
    name: '',
    species: null,
    birthDateInput: '',
    photoUri: null,
  };

  export default function PetFormScreen() {
    const params = useLocalSearchParams<{ id?: string }>();
    const idParam = params.id;
    const editId = idParam ? Number.parseInt(idParam, 10) : null;
    const mode: Mode = editId && Number.isFinite(editId) ? 'edit' : 'create';

    const db = useSQLiteContext();
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];

    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [status, setStatus] = useState<Status>(mode === 'edit' ? 'loading' : 'idle');
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

    const nameRef = useRef<TextInput>(null);
    const dateRef = useRef<TextInput>(null);
    const speciesSheetRef = useRef<SpeciesPickerSheetRef>(null);

    // Stub handlers — replaced in subsequent steps.
    const cancel = () => router.back();
    const submit = () => undefined;
    const isValid = false;

    const headerTitle =
      mode === 'create' ? 'Novo pet' : form.name ? `Editar ${form.name}` : 'Editar pet';
    const saveLabel =
      status === 'submitting' ? 'Salvando…' : mode === 'create' ? 'Salvar' : 'Salvar alterações';

    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            hitSlop={12}
            onPress={cancel}
            disabled={status === 'submitting'}
            style={({ pressed }) => [
              styles.cancelButton,
              { opacity: status === 'submitting' ? 0.6 : pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.cancelLabel, { color: theme.foreground }]}>Cancelar</Text>
          </Pressable>

          <Text style={[styles.headerTitle, { color: theme.foreground }]} numberOfLines={1}>
            {headerTitle}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saveLabel}
            accessibilityState={{ disabled: !isValid || status === 'submitting' }}
            hitSlop={8}
            onPress={submit}
            disabled={!isValid || status === 'submitting'}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: !isValid || status === 'submitting' ? theme.muted : theme.primary,
                opacity: pressed && isValid ? 0.92 : 1,
                transform: pressed && isValid ? [{ scale: 0.98 }] : [{ scale: 1 }],
              },
            ]}
          >
            {status === 'submitting' ? (
              <ActivityIndicator size="small" color={theme.primaryForeground} />
            ) : null}
            <Text
              style={[
                styles.saveLabel,
                {
                  color:
                    !isValid || status === 'submitting'
                      ? theme.mutedForeground
                      : theme.primaryForeground,
                },
              ]}
            >
              {saveLabel}
            </Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.photoBlock}>
              <PhotoUploadCircle
                uri={form.photoUri}
                onChange={(uri) => setForm((s) => ({ ...s, photoUri: uri }))}
              />
            </View>

            <View style={styles.field}>
              <Input
                ref={nameRef}
                label="NOME"
                placeholder="ex.: Rex"
                value={form.name}
                onChangeText={(v) => setForm((s) => ({ ...s, name: v }))}
                errorText={errors.name}
                disabled={status === 'submitting' || status === 'loading'}
                maxLength={100}
                returnKeyType="next"
                autoCapitalize="words"
                onSubmitEditing={() => speciesSheetRef.current?.present()}
              />
            </View>

            <View style={styles.field}>
              <Input
                label="ESPÉCIE"
                placeholder="Selecione a espécie"
                value=""
                onChangeText={() => undefined}
                displayValue={form.species ?? undefined}
                onPress={() => speciesSheetRef.current?.present()}
                accessibilityRole="combobox"
                accessibilityLabel="Espécie"
                accessibilityValue={{ text: form.species ?? 'Não selecionada' }}
                errorText={errors.species}
                disabled={status === 'submitting' || status === 'loading'}
                trailing={
                  <IconSymbol name="chevron.down" size={16} color={theme.mutedForeground} />
                }
              />
            </View>

            <View style={styles.field}>
              <Input
                ref={dateRef}
                label="DATA DE NASCIMENTO"
                placeholder="dd/mm/aaaa"
                value={form.birthDateInput}
                onChangeText={(v) => setForm((s) => ({ ...s, birthDateInput: v }))}
                errorText={errors.birthDateInput}
                helperText={errors.birthDateInput ? undefined : 'Opcional'}
                disabled={status === 'submitting' || status === 'loading'}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                returnKeyType="done"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <SpeciesPickerSheet
          ref={speciesSheetRef}
          value={form.species}
          onChange={(next) => setForm((s) => ({ ...s, species: next }))}
        />
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    screen: { flex: 1 },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 12,
    },
    cancelButton: {
      minWidth: 64,
      height: 36,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    cancelLabel: {
      fontFamily: FontFamilies.sans.medium,
      fontSize: 14,
      letterSpacing: -0.1,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: FontFamilies.sans.semibold,
      fontSize: 16,
      letterSpacing: -0.2,
    },
    saveButton: {
      minWidth: 64,
      height: 32,
      borderRadius: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    saveLabel: {
      fontFamily: FontFamilies.sans.medium,
      fontSize: 13,
      letterSpacing: -0.1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
    },
    photoBlock: {
      alignItems: 'center',
      marginBottom: 24,
    },
    field: {
      marginBottom: 18,
    },
  });
  ```

  At this point, the screen renders, the picker opens (selecting works), the photo picker works (`PhotoUploadCircle` is self-contained). Submit is a no-op and validity is hard-coded `false`. We add the real logic next.

- [ ] **Step 6.2: Add validation + isValid computation**

  Replace the `isValid` line and add a `validate` function. After the form-state declarations and before `cancel`:

  ```tsx
  const trimmedName = form.name.trim();

  const validateForSubmit = useCallback((): {
    ok: boolean;
    errors: Partial<Record<keyof FormState, string>>;
    isoDate: string | null;
  } => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!trimmedName) e.name = 'Informe o nome do pet.';
    else if (trimmedName.length > 100) e.name = 'Nome muito longo (máximo 100 caracteres).';

    if (!form.species) e.species = 'Selecione a espécie.';

    let isoDate: string | null = null;
    const raw = form.birthDateInput.trim();
    if (raw) {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
      if (!m) {
        e.birthDateInput = 'Formato inválido. Use dd/mm/aaaa.';
      } else {
        const [, dd, mm, yyyy] = m;
        const day = Number(dd);
        const month = Number(mm);
        const year = Number(yyyy);
        const parsed = new Date(year, month - 1, day);
        const valid =
          parsed.getFullYear() === year &&
          parsed.getMonth() === month - 1 &&
          parsed.getDate() === day;
        if (!valid) {
          e.birthDateInput = 'Formato inválido. Use dd/mm/aaaa.';
        } else if (parsed.getTime() > Date.now()) {
          e.birthDateInput = 'A data não pode ser no futuro.';
        } else {
          isoDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
      }
    }

    return { ok: Object.keys(e).length === 0, errors: e, isoDate };
  }, [trimmedName, form.species, form.birthDateInput]);

  // Save button is enabled when the two required fields are present.
  // Birth-date / photo errors surface only on submit.
  const isValid =
    mode === 'edit'
      ? status !== 'loading'
      : trimmedName.length > 0 && trimmedName.length <= 100 && !!form.species;
  ```

  Delete the previous `const isValid = false;` line.

  Rationale notes:
  - The full validator runs only on submit (returns `errors` and `isoDate`); the inline `isValid` is the lightweight gate for the Save button enabled state.
  - In edit mode we treat "always enabled" as the UX rule because the form is pre-filled and the user can submit a no-op edit; the validator still runs at submit time to catch e.g. a manually-typed bad date.
  - `birthDateInput` errors only appear after a submit attempt — not on every keystroke — to avoid the input flashing red as the user types.

- [ ] **Step 6.3: Add the edit-mode `useEffect` that loads the pet**

  Right after the validator definition, add the load effect:

  ```tsx
  useEffect(() => {
    if (mode !== 'edit' || editId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await db.getFirstAsync<Pet>(
          'SELECT id, name, species, birth_date, photo_uri, created_at FROM pets WHERE id = ?',
          editId
        );
        if (cancelled) return;
        if (!row) {
          Alert.alert('Pet não encontrado', 'Este pet foi removido. A tela vai fechar.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        const displayDate = row.birth_date
          ? (() => {
              const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.birth_date!);
              return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
            })()
          : '';
        setForm({
          name: row.name,
          species: row.species,
          birthDateInput: displayDate,
          photoUri: row.photo_uri,
        });
        setStatus('idle');
      } catch (err) {
        if (cancelled) return;
        console.warn('Failed to load pet', err);
        Alert.alert('Erro', 'Não foi possível carregar este pet.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, editId, mode]);
  ```

  Notes:
  - `let cancelled = false` + cleanup pattern protects against state updates after unmount (which warns in dev).
  - ISO `aaaa-mm-dd` → display `dd/mm/aaaa` conversion is local to this effect.
  - Pet-not-found dismisses the modal with a friendly alert.

- [ ] **Step 6.4: Implement `submit`**

  Replace the placeholder `submit` with the real one. Place this after the load `useEffect`:

  ```tsx
  const submit = async () => {
    const { ok, errors: validationErrors, isoDate } = validateForSubmit();
    setErrors(validationErrors);
    if (!ok || !form.species) {
      return;
    }
    setStatus('submitting');
    try {
      if (mode === 'create') {
        await db.runAsync(
          'INSERT INTO pets (name, species, birth_date, photo_uri) VALUES (?, ?, ?, ?)',
          trimmedName,
          form.species,
          isoDate,
          form.photoUri
        );
      } else if (editId !== null) {
        await db.runAsync(
          'UPDATE pets SET name = ?, species = ?, birth_date = ?, photo_uri = ? WHERE id = ?',
          trimmedName,
          form.species,
          isoDate,
          form.photoUri,
          editId
        );
      }
      router.back();
    } catch (err) {
      console.warn('Submit failed', err);
      setStatus('idle');
      Alert.alert(
        'Erro',
        mode === 'create'
          ? 'Não foi possível salvar o pet. Tente novamente.'
          : 'Não foi possível atualizar o pet. Tente novamente.'
      );
    }
  };
  ```

  Notes:
  - The DB writes are parameterised (lib/CLAUDE.md rule).
  - On error we revert to `idle` and surface an alert. The form values remain so the user can retry.
  - On success: `router.back()` returns to the caller (Pets List or Pet Detail), where `useFocusEffect` will refetch.

- [ ] **Step 6.5: Clear field-level error on edit**

  When the user starts typing in a field that previously had an error, clear that field's error. Modify the three `onChangeText` props on the inputs to also clear their error:
  - Name input:

    ```tsx
    onChangeText={(v) => {
      setForm((s) => ({ ...s, name: v }));
      if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
    }}
    ```

  - Date input:

    ```tsx
    onChangeText={(v) => {
      setForm((s) => ({ ...s, birthDateInput: v }));
      if (errors.birthDateInput)
        setErrors((e) => ({ ...e, birthDateInput: undefined }));
    }}
    ```

  - Species change (in the `SpeciesPickerSheet` `onChange` prop at the bottom):
    ```tsx
    onChange={(next) => {
      setForm((s) => ({ ...s, species: next }));
      if (errors.species) setErrors((e) => ({ ...e, species: undefined }));
    }}
    ```

  This keeps the in-form error timing predictable: errors appear only after a failed submit and disappear the moment the user starts addressing the offending field.

- [ ] **Step 6.6: Validate**

  Run:

  ```bash
  npm run typecheck && npm run lint && npx prettier --write app/pet-form.tsx && npm run format:check
  ```

  Expected: all green. If typecheck complains about `useLocalSearchParams` type, the typed-routes generator may need a refresh — restart Metro (`Ctrl+C` then `npx expo start --clear`) so `.expo/types/router.d.ts` regenerates.

- [ ] **Step 6.7: Checkpoint — wait for user approval**

  Show: `wc -l app/pet-form.tsx`. The user will exercise the create flow on the emulator (the route isn't registered yet — Task 7 — so they can only smoke-test by opening `/pet-form` manually via deep link, OR wait for Task 7 to flow naturally from Pets List). Either way: wait for "approved" or "go" before Task 7.

---

## Task 7: Register the `pet-form` route in the root layout

Adds the modal screen to the Stack so `router.push('/pet-form')` from Pets List actually resolves.

**Files:**

- Modify: `app/_layout.tsx`

- [ ] **Step 7.1: Read the current `app/_layout.tsx`**

  Run: read `app/_layout.tsx`. The Stack currently has two screens: `(tabs)` and `modal`.

- [ ] **Step 7.2: Add a `Stack.Screen` for `pet-form`**

  Find the Stack block. Inside it, after the `<Stack.Screen name="modal" .../>` line, add:

  ```tsx
  <Stack.Screen name="pet-form" options={{ presentation: 'modal', headerShown: false }} />
  ```

  Final Stack block reads:

  ```tsx
  <Stack>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    <Stack.Screen name="pet-form" options={{ presentation: 'modal', headerShown: false }} />
  </Stack>
  ```

  `headerShown: false` because we render our own header inside `pet-form.tsx` (the `PetFormHeader` block in Task 6.1).

- [ ] **Step 7.3: Validate**

  Run:

  ```bash
  npm run typecheck && npm run lint && npx prettier --write "app/_layout.tsx" && npm run format:check
  ```

  Expected: all green.

- [ ] **Step 7.4: Restart Metro with --clear**

  Tell the user: stop Metro (`Ctrl+C`), then `npx expo start --clear`. The typed-routes generator needs to refresh for `/pet-form` to be a recognised pathname.

- [ ] **Step 7.5: Checkpoint — wait for user approval**

  Show: `git diff "app/_layout.tsx"`. Wait for "approved" before Task 8.

---

## Task 8: Final verification + manual test + commit

End-to-end smoke + the one logical commit.

- [ ] **Step 8.1: Run all gates once more**

  ```bash
  npm run typecheck && npm run lint && npm run format:check
  ```

  Expected: all exit 0.

- [ ] **Step 8.2: Restart Metro with full cache clear**

  Tell the user: `Ctrl+C` Metro, then `npx expo start --clear`. On the emulator: fully kill the app and reopen.

- [ ] **Step 8.3: Manual checklist — exercise every state**

  Walk through these in both light and dark mode:
  - [ ] From Pets List, tap the header "Adicionar" → Pet Form opens as modal (slides up on iOS, fades on Android)
  - [ ] Header shows "Novo pet" centred, Cancelar left, Salvar disabled right (muted bg)
  - [ ] Photo upload circle shows dashed border + paw print + primary camera badge
  - [ ] Tap photo → native permission prompt appears (first time); accept → library opens; pick a photo → returns to form, circle now shows image, badge cuts cleanly
  - [ ] Long-press photo → "Remover foto?" alert; tap Remover → circle reverts to placeholder
  - [ ] Type a name → Salvar still disabled (species missing)
  - [ ] Tap "Selecione a espécie" → bottom sheet rises, 60 % height, list scrolls, drag handle visible
  - [ ] Tap "Cão" → sheet dismisses, species field shows "Cão", chevron-down still visible, Salvar **enabled** (primary bg)
  - [ ] Type "31/13/2020" → no inline error yet (it appears only on submit)
  - [ ] Tap Salvar → field shows "Formato inválido. Use dd/mm/aaaa." in destructive red
  - [ ] Fix to "15/03/2020", tap Salvar → form submits, "Salvando…" shows briefly, modal dismisses, Pets List shows new pet
  - [ ] From Pets List, long-press the new pet → action sheet → Editar → Pet Form opens in edit mode with title "Editar {name}", fields pre-filled, photo (if any) loaded, Salvar enabled
  - [ ] Change the name, tap Salvar → modal dismisses, list shows updated name
  - [ ] Tap Cancelar at any time → dismisses without saving
  - [ ] Toggle system theme mid-flow → header, inputs, sheet, badges all invert cleanly

- [ ] **Step 8.4: Checkpoint — final summary, wait for user approval**

  Show:

  ```bash
  git status -sb && git diff --stat
  ```

  Wait for explicit approval before any commit. Per the user's standing instruction, this plan never commits autonomously.

  When approved, commit as one logical change:

  ```bash
  git add -A
  git commit -m "$(cat <<'EOF'
  Spec 02 — Pet Form

  Implement docs/specs/02-pet-form.md per the visual contract at
  docs/superpowers/specs/2026-05-12-pet-form-design.md. Add the Input
  primitive (components/form/input.tsx), PhotoUploadCircle (with
  expo-image-picker), SpeciesPickerSheet (BottomSheetFlatList of the 15
  species). Wire app/pet-form.tsx with create/edit modes, validation,
  dd/mm/aaaa ↔ ISO conversion, and parameterised INSERT/UPDATE. Add 4
  lucide icon mappings (chevron.down, checkmark, photo.fill, camera.fill)
  and register the expo-image-picker plugin in app.json with PT-BR
  permission strings.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Risks & Plan B notes

**R1. `expo-image-picker` permission flow in Expo Go vs dev-client.**
In Expo Go, the permission strings come from the plugin config at runtime (works without prebuild). In a dev-client, the prebuild step must have run after the `app.json` change. If permission prompts don't appear after Task 2: tell the user to either run in Expo Go OR run `npx expo prebuild --clean` manually. Don't run prebuild autonomously — destructive.

**R2. `MediaTypeOptions.Images` deprecation.**
SDK 54's `expo-image-picker@~17.0.11` accepts both `MediaTypeOptions.Images` (deprecated but supported) and the new `['images']` literal. The plan uses the former for clarity. If a future linter / typecheck flags it, switch to `mediaTypes: ['images']` in `components/photo-upload-circle.tsx:39`.

**R3. `BottomSheetFlatList` snap-point capping the list.**
With `snapPoints={['60%']}`, only ~10 species are visible at a time on a normal phone — the user scrolls for the last 5. If the user prefers all 15 visible at once, switch to `enableDynamicSizing` and remove `snapPoints`; the sheet will size to content (~720 px tall on iPhone 15-ish, which is acceptable).

**R4. Modal stack vs typed routes.**
With typed routes enabled, `/pet-form` becomes a literal pathname only after Metro regenerates `.expo/types/router.d.ts`. If typecheck errors in `app/(tabs)/index.tsx` about `navigate('/pet-form')` after Task 7, restart Metro with `--clear`. The `navigate(path as never)` escape hatch added in spec 01 already covers the call sites, so this should not actually break — but worth knowing if it does.

**R5. Keyboard pushes the photo / sheet off-screen on small Android.**
`KeyboardAvoidingView` with `behavior: undefined` on Android usually relies on `windowSoftInputMode: adjustResize`, which Expo configures by default. If on a small Android phone the photo gets clipped when the keyboard opens, change `behavior` to `'height'` for Android specifically. Worth verifying during Step 8.3.

**R6. The header "Editar {name}" overflows on long names.**
We pass `numberOfLines={1}` — text truncates with ellipsis. Acceptable behaviour. If the user reports it looks ugly, consider switching to "Editar pet" always in edit mode (no name interpolation).

---

## Done When (mirrors the spec's acceptance criteria)

- [ ] `components/ui/icon-symbol.tsx` MAPPING includes `chevron.down`, `checkmark`, `photo.fill`, `camera.fill`.
- [ ] `app.json` `plugins` array includes the `expo-image-picker` entry with PT-BR permission strings.
- [ ] `components/form/input.tsx` exists and exports `Input` matching the spec.
- [ ] `components/photo-upload-circle.tsx` exists and exports `PhotoUploadCircle` with image-picker + long-press-to-remove flow.
- [ ] `components/species-picker-sheet.tsx` exists and exports `SpeciesPickerSheet` (forwardRef API).
- [ ] `app/pet-form.tsx` exists with header + photo block + 3 inputs + sheet, handles create + edit + submitting + invalid + permission-denied + pet-not-found states.
- [ ] `app/_layout.tsx` registers `pet-form` with `presentation: 'modal'`, `headerShown: false`.
- [ ] `npm run lint && npm run typecheck && npm run format:check` all green.
- [ ] All user-facing strings PT-BR per the design spec's strings table.
- [ ] Both light and dark mode render correctly across all states.
- [ ] No autonomous commits — every commit step waited for user approval.

Functional behaviour described in [`docs/specs/02-pet-form.md`](../../specs/02-pet-form.md) (routing, queries, validation rules, accessibility, out-of-scope) is preserved.
