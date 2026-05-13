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
