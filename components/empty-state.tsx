import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type EmptyStateProps = {
  icon: IconSymbolName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionAccessibilityLabel?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionAccessibilityLabel,
}: EmptyStateProps) {
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];

  return (
    <View style={styles.container}>
      <View style={[styles.medallion, { backgroundColor: theme.muted, borderColor: theme.border }]}>
        <IconSymbol name={icon} size={28} color={theme.foreground} weight="regular" />
      </View>

      <Text accessibilityRole="header" style={[styles.title, { color: theme.foreground }]}>
        {title}
      </Text>

      <Text style={[styles.description, { color: theme.mutedForeground }]}>{description}</Text>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          onPress={onAction}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.primary,
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
            buttonShadow(scheme),
          ]}
        >
          <IconSymbol name="plus" size={14} color={theme.primaryForeground} weight="semibold" />
          <Text style={[styles.buttonLabel, { color: theme.primaryForeground }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 32,
  },
  medallion: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  description: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 240,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonLabel: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 14,
    letterSpacing: -0.1,
  },
});

function buttonShadow(scheme: 'light' | 'dark') {
  if (scheme === 'dark') return null;
  return Platform.select({
    ios: {
      shadowColor: '#09090b',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    android: { elevation: 1 },
    web: { boxShadow: '0 1px 2px rgba(9,9,11,0.06)' },
    default: null,
  });
}
