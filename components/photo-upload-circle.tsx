import { Image } from 'expo-image';
import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  MediaLibraryPickerSheet,
  type MediaLibraryPickerSheetRef,
} from '@/components/media-library-picker-sheet';
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
  const pickerRef = useRef<MediaLibraryPickerSheetRef>(null);

  const openPicker = () => {
    pickerRef.current?.present();
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
        onPress={openPicker}
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
            contentFit="cover"
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

      <Text style={[styles.caption, { color: theme.mutedForeground }]} accessibilityElementsHidden>
        {uri ? 'Toque para alterar foto' : 'Toque para escolher foto'}
      </Text>

      <MediaLibraryPickerSheet ref={pickerRef} onPick={onChange} />
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
