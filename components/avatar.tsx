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
