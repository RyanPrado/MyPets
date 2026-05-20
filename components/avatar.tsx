import { Image } from 'expo-image';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AvatarSize = 'sm' | 'md' | 'lg';

export type AvatarProps = ViewProps & {
  name: string;
  size?: AvatarSize;
  photoUri?: string | null;
};

const DIMENSIONS: Record<AvatarSize, { box: number; font: number; radius: number }> = {
  sm: { box: 32, font: 12, radius: 7 },
  md: { box: 38, font: 13, radius: 8 },
  lg: { box: 64, font: 22, radius: 14 },
};

function initial(name: string): string {
  const stripped = name.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const first = stripped.trim().charAt(0);
  return first ? first.toUpperCase() : '?';
}

export function Avatar({ name, size = 'md', photoUri, style, ...rest }: AvatarProps) {
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
          overflow: 'hidden',
        },
        style,
      ]}
      {...rest}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
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
      )}
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
  image: {
    width: '100%',
    height: '100%',
  },
});
