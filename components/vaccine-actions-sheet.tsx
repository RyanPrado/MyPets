import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Vaccine } from '@/lib/db-types';
import { formatCurrencyCents, formatDate } from '@/lib/utils/format';

export type VaccineActionsSheetRef = {
  present: (vaccine: Vaccine) => void;
  dismiss: () => void;
};

export type VaccineActionsSheetProps = {
  onEdit: (vaccine: Vaccine) => void;
  onDelete: (vaccine: Vaccine) => void;
};

export const VaccineActionsSheet = forwardRef<VaccineActionsSheetRef, VaccineActionsSheetProps>(
  function VaccineActionsSheet({ onEdit, onDelete }, ref) {
    const modalRef = useRef<BottomSheetModal>(null);
    const [vaccine, setVaccine] = useState<Vaccine | null>(null);
    const scheme = useColorScheme() ?? 'light';
    const theme = Theme[scheme];

    useImperativeHandle(
      ref,
      () => ({
        present(next) {
          setVaccine(next);
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
      if (!vaccine) return;
      const target = vaccine;
      modalRef.current?.dismiss();
      onEdit(target);
    };

    const handleDelete = () => {
      if (!vaccine) return;
      const target = vaccine;
      modalRef.current?.dismiss();
      onDelete(target);
    };

    const previewMeta = vaccine
      ? [
          formatDate(vaccine.date_given),
          vaccine.next_due_date ? `próxima ${formatDate(vaccine.next_due_date)}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
    const previewAmount = vaccine ? formatCurrencyCents(vaccine.amount_paid_cents) : '';

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
          {vaccine ? (
            <View style={styles.container}>
              <View style={[styles.preview, { borderBottomColor: theme.border }]}>
                <View style={[styles.previewIcon, { backgroundColor: theme.warningForeground }]}>
                  <IconSymbol name="cross.case.fill" size={20} color={theme.warning} />
                </View>
                <View style={styles.previewText}>
                  <Text
                    style={[styles.previewName, { color: theme.foreground }]}
                    numberOfLines={1}
                  >
                    {vaccine.name}
                  </Text>
                  <Text
                    style={[styles.previewMeta, { color: theme.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {previewMeta}
                  </Text>
                </View>
                {previewAmount ? (
                  <Text style={[styles.previewAmount, { color: theme.primary }]} numberOfLines={1}>
                    {previewAmount}
                  </Text>
                ) : null}
              </View>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar vacina ${vaccine.name}`}
                  onPress={handleEdit}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: pressed ? theme.accent : 'transparent' },
                  ]}
                >
                  <IconSymbol name="square.and.pencil" size={18} color={theme.foreground} />
                  <Text style={[styles.actionLabel, { color: theme.foreground }]}>
                    Editar vacina
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir vacina ${vaccine.name}`}
                  onPress={handleDelete}
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: pressed ? theme.accent : 'transparent' },
                  ]}
                >
                  <IconSymbol name="trash" size={18} color={theme.destructive} />
                  <Text style={[styles.actionLabel, { color: theme.destructive }]}>
                    Excluir vacina
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
  previewIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    flex: 1,
    minWidth: 0,
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
  previewAmount: {
    fontFamily: FontFamilies.sans.bold,
    fontSize: 14,
    letterSpacing: -0.1,
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
