import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { PetActionsSheet, type PetActionsSheetRef } from '@/components/pet-actions-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSQLiteContext } from '@/lib/db';
import type { Pet } from '@/lib/db-types';
import { formatPetMeta } from '@/lib/pet-meta';

type Status = 'loading' | 'ready' | 'error';

// Routes /pet-form and /pet/[id] are created in specs 02 and 03. Until they
// exist, typed-routes rejects the literals — bypass with a thin helper.
function navigate(path: string) {
  router.push(path as never);
}

export default function PetsScreen() {
  const db = useSQLiteContext();
  const [pets, setPets] = useState<Pet[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const sheetRef = useRef<PetActionsSheetRef>(null);
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];

  const load = useCallback(async () => {
    try {
      const rows = await db.getAllAsync<Pet>(
        'SELECT id, name, species, birth_date, photo_uri, created_at FROM pets ORDER BY name COLLATE NOCASE'
      );
      setPets(rows);
      setStatus('ready');
    } catch (err) {
      console.warn('Failed to load pets', err);
      setStatus('error');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const goToCreate = () => navigate('/pet-form');
  const goToDetail = (id: number) => navigate(`/pet/${id}`);
  const goToEdit = (id: number) => navigate(`/pet-form?id=${id}`);

  const handleEdit = (pet: Pet) => goToEdit(pet.id);

  const handleDelete = (pet: Pet) => {
    Alert.alert('Excluir?', 'Esta ação é irreversível.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.runAsync('DELETE FROM pets WHERE id = ?', pet.id);
            await load();
          } catch (err) {
            console.warn('Failed to delete pet', err);
            Alert.alert('Erro', 'Não foi possível excluir o pet. Tente novamente.');
          }
        },
      },
    ]);
  };

  const retry = () => {
    setStatus('loading');
    void load();
  };

  const subline =
    status === 'loading'
      ? 'Carregando…'
      : status === 'error'
        ? 'Erro ao carregar'
        : pets.length === 0
          ? 'Comece a registrar'
          : `${pets.length} pets registrados`;

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerText}>
          <Text
            accessibilityRole="header"
            style={[styles.headerTitle, { color: theme.foreground }]}
          >
            Meus pets
          </Text>
          <Text
            style={[
              styles.headerSubline,
              { color: status === 'error' ? theme.destructive : theme.mutedForeground },
            ]}
          >
            {subline}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buscar pets"
            hitSlop={6}
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderColor: theme.border,
                backgroundColor: pressed ? theme.accent : 'transparent',
              },
            ]}
          >
            <IconSymbol name="search" size={16} color={theme.foreground} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar pet"
            onPress={goToCreate}
            hitSlop={6}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <IconSymbol name="plus" size={14} color={theme.primaryForeground} weight="semibold" />
            <Text style={[styles.primaryButtonLabel, { color: theme.primaryForeground }]}>
              Adicionar
            </Text>
          </Pressable>
        </View>
      </View>

      {status === 'loading' ? (
        <SkeletonList />
      ) : status === 'error' ? (
        <ErrorView onRetry={retry} />
      ) : pets.length === 0 ? (
        <EmptyState
          icon="pawprint.fill"
          title="Nenhum pet ainda"
          description="Cadastre seu primeiro pet para começar a registrar vacinas e cuidados."
          actionLabel="Adicionar pet"
          actionAccessibilityLabel="Adicionar primeiro pet"
          onAction={goToCreate}
        />
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(p) => String(p.id)}
          ListHeaderComponent={
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>
                Nome · Espécie · Idade
              </Text>
              <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>
                {pets.length.toString().padStart(2, '0')}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <PetRow
              pet={item}
              onPress={() => goToDetail(item.id)}
              onLongPress={() => sheetRef.current?.present(item)}
              isFirst={index === 0}
              isLast={index === pets.length - 1}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.foreground}
            />
          }
          ListFooterComponent={
            <View accessible={false} style={styles.listFooter}>
              <Text style={[styles.listFooterText, { color: theme.mutedForeground }]}>
                Mantenha pressionado para mais ações
              </Text>
            </View>
          }
        />
      )}

      <PetActionsSheet ref={sheetRef} onEdit={handleEdit} onDelete={handleDelete} />
    </SafeAreaView>
  );
}

function PetRow({
  pet,
  onPress,
  onLongPress,
  isFirst,
  isLast,
}: {
  pet: Pet;
  onPress: () => void;
  onLongPress: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];
  const meta = formatPetMeta(pet.species, pet.birth_date);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pet.name}, ${meta}`}
      accessibilityHint="Toque para abrir os detalhes, segure para opções"
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
      <Avatar name={pet.name} size="md" photoUri={pet.photo_uri} />
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: theme.foreground }]} numberOfLines={1}>
          {pet.name}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.mutedForeground }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <IconSymbol name="chevron.right" size={16} color={theme.mutedForeground} />
    </Pressable>
  );
}

function SkeletonList() {
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];
  const shimmer = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <View style={styles.listContent}>
      <View style={styles.metaRow}>
        <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>Carregando…</Text>
        <Text style={[styles.metaLabel, { color: theme.mutedForeground }]}>—</Text>
      </View>
      <View
        style={[styles.skeletonCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.skeletonRow,
              {
                borderBottomColor: theme.border,
                borderBottomWidth: i === 2 ? 0 : StyleSheet.hairlineWidth,
                opacity: shimmer,
              },
            ]}
          >
            <View style={[styles.skeletonAvatar, { backgroundColor: theme.muted }]} />
            <View style={styles.skeletonLines}>
              <View
                style={[
                  styles.skeletonLine,
                  styles.skeletonLineWide,
                  { backgroundColor: theme.muted },
                ]}
              />
              <View
                style={[
                  styles.skeletonLine,
                  styles.skeletonLineNarrow,
                  { backgroundColor: theme.muted },
                ]}
              />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];

  return (
    <View style={styles.errorContainer}>
      <View
        style={[
          styles.errorMedallion,
          {
            backgroundColor: theme.destructiveSurface,
            borderColor: theme.destructiveBorder,
          },
        ]}
      >
        <IconSymbol name="alert-triangle" size={22} color={theme.destructive} />
      </View>
      <Text style={[styles.errorTitle, { color: theme.foreground }]}>
        Não foi possível carregar
      </Text>
      <Text style={[styles.errorDesc, { color: theme.mutedForeground }]}>
        Verifique a conexão e tente novamente. Seus dados continuam salvos no aparelho.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tentar novamente"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.secondaryButton,
          {
            backgroundColor: pressed ? theme.accent : theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <IconSymbol name="refresh-cw" size={14} color={theme.foreground} />
        <Text style={[styles.secondaryButtonLabel, { color: theme.foreground }]}>
          Tentar novamente
        </Text>
      </Pressable>
    </View>
  );
}

const platformRoundedTitle =
  Platform.OS !== 'android' ? FontFamilies.sans.semibold : FontFamilies.sans.bold;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontFamily: platformRoundedTitle,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.7,
  },
  headerSubline: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  primaryButtonLabel: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 13,
    letterSpacing: -0.1,
  },

  listContent: {
    paddingHorizontal: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  metaLabel: {
    fontFamily: FontFamilies.mono.medium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowName: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  rowMeta: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 12,
    marginTop: 3,
  },

  listFooter: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  listFooterText: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 12,
  },

  skeletonCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  skeletonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  skeletonLines: {
    flex: 1,
    gap: 6,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 999,
  },
  skeletonLineWide: { width: '50%' },
  skeletonLineNarrow: { width: '30%' },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  errorMedallion: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorTitle: {
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
    textAlign: 'center',
    marginTop: 4,
  },
  errorDesc: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 240,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  secondaryButtonLabel: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 14,
    letterSpacing: -0.1,
  },
});
