import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { daysUntil, formatDate } from '@/lib/utils/format';

const WARNING_THRESHOLD_DAYS = 30;

export type VaccineSummaryProps = {
  count: number;
  lastDate: string | null;
  nextDate: string | null;
};

export function VaccineSummary({ count, lastDate, nextDate }: VaccineSummaryProps) {
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];
  const daysToNext = daysUntil(nextDate);
  const showWarning =
    daysToNext !== null && daysToNext >= 0 && daysToNext <= WARNING_THRESHOLD_DAYS;

  const accessibilityLabel = [
    `${count} vacina${count === 1 ? '' : 's'} registrada${count === 1 ? '' : 's'}.`,
    lastDate ? `Última em ${formatDate(lastDate)}.` : null,
    nextDate ? `Próxima prevista para ${formatDate(nextDate)}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.headRow}>
        <Text style={[styles.count, { color: theme.primary }]}>{count}</Text>
        {showWarning ? (
          <View
            accessible
            accessibilityLabel={`Próxima vacina em ${daysToNext} dia${daysToNext === 1 ? '' : 's'}`}
            style={[styles.chip, { backgroundColor: theme.warningForeground }]}
          >
            <IconSymbol name="exclamationmark.triangle.fill" size={12} color={theme.warning} />
            <Text style={[styles.chipLabel, { color: theme.warning }]}>
              Próxima em {daysToNext}d
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.mutedForeground }]}>Última administrada</Text>
        <Text style={[styles.rowValue, { color: theme.foreground }]}>
          {formatDate(lastDate) || '—'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.mutedForeground }]}>Próxima prevista</Text>
        <Text style={[styles.rowValue, { color: theme.foreground }]}>
          {formatDate(nextDate) || '—'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  count: {
    fontFamily: FontFamilies.sans.bold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipLabel: {
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 12,
  },
  rowValue: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 13,
    letterSpacing: -0.1,
  },
});
