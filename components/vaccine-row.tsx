import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Vaccine } from '@/lib/db-types';
import { formatCurrencyCents, formatDate } from '@/lib/utils/format';

export type VaccineRowProps = {
  vaccine: Vaccine;
  onPress: () => void;
  onLongPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
};

export function VaccineRow({ vaccine, onPress, onLongPress, isFirst, isLast }: VaccineRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];

  const dateText = formatDate(vaccine.date_given);
  const nextText = vaccine.next_due_date ? ` · próxima ${formatDate(vaccine.next_due_date)}` : '';
  const amountText = formatCurrencyCents(vaccine.amount_paid_cents);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${vaccine.name}, administrada em ${dateText}`}
      accessibilityHint="Toque para editar, segure para opções"
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.accent : theme.card,
          borderColor: theme.border,
          borderTopWidth: isFirst ? StyleSheet.hairlineWidth : 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderTopLeftRadius: isFirst ? 12 : 0,
          borderTopRightRadius: isFirst ? 12 : 0,
          borderBottomLeftRadius: isLast ? 12 : 0,
          borderBottomRightRadius: isLast ? 12 : 0,
        },
      ]}
    >
      <View style={styles.text}>
        <Text style={[styles.name, { color: theme.foreground }]} numberOfLines={1}>
          {vaccine.name}
        </Text>
        <Text style={[styles.meta, { color: theme.mutedForeground }]} numberOfLines={1}>
          {dateText}
          {nextText}
        </Text>
      </View>
      {amountText ? (
        <Text style={[styles.amount, { color: theme.primary }]} numberOfLines={1}>
          {amountText}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  meta: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 12,
    marginTop: 3,
  },
  amount: {
    fontFamily: FontFamilies.sans.bold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
});
