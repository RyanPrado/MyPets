import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Pet } from '@/lib/db-types';
import { formatPetMeta } from '@/lib/pet-meta';

export type PetActionsSheetRef = {
  present: (pet: Pet) => void;
  dismiss: () => void;
};

export type PetActionsSheetProps = {
  onEdit: (pet: Pet) => void;
  onDelete: (pet: Pet) => void;
};

export const PetActionsSheet = forwardRef<PetActionsSheetRef, PetActionsSheetProps>(
  function PetActionsSheet({ onEdit, onDelete }, ref) {
    const modalRef = useRef<BottomSheetModal>(null);
    const [pet, setPet] = useState<Pet | null>(null);
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];

    useImperativeHandle(
      ref,
      () => ({
        present(nextPet) {
          setPet(nextPet);
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

    const handleEdit = () => {
      if (!pet) return;
      const target = pet;
      modalRef.current?.dismiss();
      onEdit(target);
    };

    const handleDelete = () => {
      if (!pet) return;
      const target = pet;
      modalRef.current?.dismiss();
      onDelete(target);
    };

    return (
      <BottomSheetModal
        ref={modalRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.card, borderRadius: 16 }}
        handleComponent={() => (
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>
        )}
      >
        <BottomSheetView>
          {pet ? (
            <View style={styles.container}>
              <View style={[styles.preview, { borderBottomColor: theme.border }]}>
                <Avatar name={pet.name} size="md" />
                <View style={styles.previewText}>
                  <Text style={[styles.previewName, { color: theme.foreground }]} numberOfLines={1}>
                    {pet.name}
                  </Text>
                  <Text
                    style={[styles.previewMeta, { color: theme.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {formatPetMeta(pet.species, pet.birth_date)}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${pet.name}`}
                  onPress={handleEdit}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: pressed ? theme.accent : 'transparent' },
                  ]}
                >
                  <IconSymbol name="square.and.pencil" size={18} color={theme.foreground} />
                  <Text style={[styles.actionLabel, { color: theme.foreground }]}>Editar pet</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir ${pet.name}`}
                  onPress={handleDelete}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: pressed ? theme.accent : 'transparent' },
                  ]}
                >
                  <IconSymbol name="trash" size={18} color={theme.destructive} />
                  <Text style={[styles.actionLabel, { color: theme.destructive }]}>
                    Excluir pet
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </BottomSheetView>
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
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 4,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewText: {
    flex: 1,
  },
  previewName: {
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  previewMeta: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    paddingTop: 8,
    gap: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionLabel: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 14,
    letterSpacing: -0.1,
  },
});
