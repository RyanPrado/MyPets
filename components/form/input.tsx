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
