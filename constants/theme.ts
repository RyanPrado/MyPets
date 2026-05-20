/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

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
    warning: '#d97706',
    warningForeground: '#fef3c7',
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
    warning: '#fbbf24',
    warningForeground: '#451a03',
  },
} as const;

/**
 * Named font families loaded by `useFonts` in `app/_layout.tsx`. Use these as
 * the `fontFamily` value in StyleSheet — they correspond to the
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

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
