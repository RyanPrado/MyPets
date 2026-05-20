import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PetActionsSheet, type PetActionsSheetRef } from '@/components/pet-actions-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VaccineActionsSheet, type VaccineActionsSheetRef } from '@/components/vaccine-actions-sheet';
import { VaccineRow } from '@/components/vaccine-row';
import { VaccineSummary } from '@/components/vaccine-summary';
import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSQLiteContext } from '@/lib/db';
import type { Pet, Vaccine } from '@/lib/db-types';
import { computeAge, formatDate } from '@/lib/utils/format';

type Status = 'loading' | 'ready' | 'not-found' | 'error';

type ThemeColors = (typeof Theme)[keyof typeof Theme];

// Spec 04 owns `/vaccine-form` (modal route). Until that file ships, typed
// routes reject the literal — bypass with a thin helper (same pattern as
// app/(tabs)/index.tsx uses for `/pet/${id}` before this spec landed).
function navigate(path: string) {
  router.push(path as never);
}

export default function PetDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const petId = params.id ? Number.parseInt(params.id, 10) : NaN;
  const validId = Number.isFinite(petId);

  const db = useSQLiteContext();
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];

  const [pet, setPet] = useState<Pet | null>(null);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const petSheetRef = useRef<PetActionsSheetRef>(null);
  const vaccineSheetRef = useRef<VaccineActionsSheetRef>(null);

  const load = useCallback(async () => {
    if (!validId) {
      setStatus('not-found');
      return;
    }
    try {
      const row = await db.getFirstAsync<Pet>(
        'SELECT id, name, species, birth_date, photo_uri, created_at FROM pets WHERE id = ?',
        petId
      );
      if (!row) {
        setPet(null);
        setVaccines([]);
        setStatus('not-found');
        return;
      }
      const rows = await db.getAllAsync<Vaccine>(
        'SELECT id, pet_id, name, date_given, amount_paid_cents, next_due_date, created_at FROM vaccines WHERE pet_id = ? ORDER BY date_given DESC',
        petId
      );
      setPet(row);
      setVaccines(rows);
      setStatus('ready');
    } catch (err) {
      console.warn('Failed to load pet detail', err);
      setStatus('error');
    }
  }, [db, petId, validId]);

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

  const retry = () => {
    setStatus('loading');
    void load();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const openOverflow = () => {
    if (pet) petSheetRef.current?.present(pet);
  };

  const handleEditPet = (target: Pet) => navigate(`/pet-form?id=${target.id}`);

  const handleDeletePet = (target: Pet) => {
    Alert.alert(
      'Excluir?',
      'Esta ação é irreversível. As vacinas também serão removidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM pets WHERE id = ?', target.id);
              goBack();
            } catch (err) {
              console.warn('Failed to delete pet', err);
              Alert.alert('Erro', 'Não foi possível excluir o pet. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  const goToCreateVaccine = () => {
    if (pet) navigate(`/vaccine-form?petId=${pet.id}`);
  };

  const goToEditVaccine = (vaccine: Vaccine) => {
    navigate(`/vaccine-form?id=${vaccine.id}&petId=${vaccine.pet_id}`);
  };

  const handleDeleteVaccine = (vaccine: Vaccine) => {
    Alert.alert('Excluir?', 'Esta ação é irreversível.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.runAsync('DELETE FROM vaccines WHERE id = ?', vaccine.id);
            await load();
          } catch (err) {
            console.warn('Failed to delete vaccine', err);
            Alert.alert('Erro', 'Não foi possível excluir a vacina. Tente novamente.');
          }
        },
      },
    ]);
  };

  const lastVaccine = vaccines[0] ?? null;
  const nextVaccine = vaccines.reduce<Vaccine | null>((acc, v) => {
    if (!v.next_due_date) return acc;
    if (!acc || !acc.next_due_date) return v;
    return v.next_due_date < acc.next_due_date ? v : acc;
  }, null);

  const headerTitle = pet?.name ?? 'Pet';

  if (status === 'not-found') {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
        <Header title="Pet" theme={theme} onBack={goBack} onOverflow={null} />
        <View style={styles.centered}>
          <Text style={[styles.centeredTitle, { color: theme.foreground }]}>
            Pet não encontrado
          </Text>
          <Text style={[styles.centeredDesc, { color: theme.mutedForeground }]}>
            Este pet pode ter sido excluído. Volte à lista para continuar.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar à lista"
            onPress={goBack}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: pressed ? theme.accent : theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonLabel, { color: theme.foreground }]}>
              Voltar à lista
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
        <Header title={headerTitle} theme={theme} onBack={goBack} onOverflow={null} />
        <View style={styles.centered}>
          <Text style={[styles.centeredTitle, { color: theme.foreground }]}>
            Não foi possível carregar
          </Text>
          <Text style={[styles.centeredDesc, { color: theme.mutedForeground }]}>
            Não foi possível carregar os dados deste pet.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tentar novamente"
            onPress={retry}
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <Header
        title={headerTitle}
        theme={theme}
        onBack={goBack}
        onOverflow={status === 'ready' ? openOverflow : null}
      />

      <FlatList
        data={vaccines}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          pet ? (
            <View>
              <Hero pet={pet} theme={theme} />

              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitle}>
                  <IconSymbol name="cross.case.fill" size={16} color={theme.foreground} />
                  <Text style={[styles.sectionLabel, { color: theme.foreground }]}>Vacinas</Text>
                </View>
                {vaccines.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar vacina"
                    onPress={goToCreateVaccine}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.addButton,
                      {
                        borderColor: theme.border,
                        backgroundColor: pressed ? theme.accent : 'transparent',
                      },
                    ]}
                  >
                    <IconSymbol name="plus" size={12} color={theme.foreground} weight="semibold" />
                    <Text style={[styles.addLabel, { color: theme.foreground }]}>Adicionar</Text>
                  </Pressable>
                ) : null}
              </View>

              {vaccines.length > 0 ? (
                <View style={styles.summaryBlock}>
                  <VaccineSummary
                    count={vaccines.length}
                    lastDate={lastVaccine?.date_given ?? null}
                    nextDate={nextVaccine?.next_due_date ?? null}
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <HeroSkeleton theme={theme} />
          )
        }
        ListEmptyComponent={
          status === 'ready' && pet ? (
            <View
              style={[
                styles.empty,
                { borderColor: theme.border, backgroundColor: theme.background },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: theme.muted }]}>
                <IconSymbol name="cross.case.fill" size={26} color={theme.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
                Sem vacinas registradas
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.mutedForeground }]}>
                Adicione a primeira vacina de {pet.name} para começar o histórico.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Adicionar primeira vacina de ${pet.name}`}
                onPress={goToCreateVaccine}
                style={({ pressed }) => [
                  styles.emptyCta,
                  {
                    backgroundColor: theme.primary,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <IconSymbol name="plus" size={14} color={theme.primaryForeground} weight="semibold" />
                <Text style={[styles.emptyCtaLabel, { color: theme.primaryForeground }]}>
                  Adicionar primeira vacina
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <VaccineRow
            vaccine={item}
            onPress={() => goToEditVaccine(item)}
            onLongPress={() => vaccineSheetRef.current?.present(item)}
            isFirst={index === 0}
            isLast={index === vaccines.length - 1}
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
          vaccines.length > 0 ? (
            <View accessible={false} style={styles.listFooter}>
              <Text style={[styles.listFooterText, { color: theme.mutedForeground }]}>
                Segure uma vacina para mais ações
              </Text>
            </View>
          ) : null
        }
      />

      <PetActionsSheet ref={petSheetRef} onEdit={handleEditPet} onDelete={handleDeletePet} />
      <VaccineActionsSheet
        ref={vaccineSheetRef}
        onEdit={goToEditVaccine}
        onDelete={handleDeleteVaccine}
      />
    </SafeAreaView>
  );
}

function Header({
  title,
  theme,
  onBack,
  onOverflow,
}: {
  title: string;
  theme: ThemeColors;
  onBack: () => void;
  onOverflow: (() => void) | null;
}) {
  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={12}
        onPress={onBack}
        style={({ pressed }) => [styles.headerIconButton, pressed && { opacity: 0.6 }]}
      >
        <IconSymbol name="chevron.left" size={20} color={theme.foreground} />
      </Pressable>

      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[styles.headerTitle, { color: theme.foreground }]}
      >
        {title}
      </Text>

      {onOverflow ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mais ações"
          hitSlop={12}
          onPress={onOverflow}
          style={({ pressed }) => [styles.headerIconButton, pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="ellipsis" size={20} color={theme.foreground} />
        </Pressable>
      ) : (
        <View style={styles.headerIconButton} />
      )}
    </View>
  );
}

function Hero({ pet, theme }: { pet: Pet; theme: ThemeColors }) {
  const age = computeAge(pet.birth_date);
  const meta = age ? `${pet.species} · ${age}` : pet.species;
  const birthLabel = pet.birth_date ? `Nasceu ${formatDate(pet.birth_date)}` : 'Nascimento não informado';

  return (
    <View style={styles.hero}>
      <Avatar name={pet.name} size="lg" photoUri={pet.photo_uri} />
      <View style={styles.heroText}>
        <Text style={[styles.heroName, { color: theme.foreground }]} numberOfLines={1}>
          {pet.name}
        </Text>
        <Text style={[styles.heroMeta, { color: theme.mutedForeground }]} numberOfLines={1}>
          {meta}
        </Text>
        <Text style={[styles.heroBirth, { color: theme.mutedForeground }]} numberOfLines={1}>
          {birthLabel}
        </Text>
      </View>
    </View>
  );
}

function HeroSkeleton({ theme }: { theme: ThemeColors }) {
  return (
    <View style={styles.hero}>
      <View style={[styles.heroSkeletonAvatar, { backgroundColor: theme.muted }]} />
      <View style={styles.heroText}>
        <View
          style={[styles.heroSkeletonLine, styles.heroSkeletonLineWide, { backgroundColor: theme.muted }]}
        />
        <View
          style={[styles.heroSkeletonLine, styles.heroSkeletonLineNarrow, { backgroundColor: theme.muted }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
  },

  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 32,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 16,
    paddingBottom: 18,
  },
  heroText: { flex: 1, minWidth: 0 },
  heroName: {
    fontFamily: FontFamilies.sans.bold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  heroMeta: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 13,
    marginTop: 4,
  },
  heroBirth: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 12,
    marginTop: 2,
  },
  heroSkeletonAvatar: { width: 64, height: 64, borderRadius: 14 },
  heroSkeletonLine: { height: 10, borderRadius: 999, marginTop: 6 },
  heroSkeletonLineWide: { width: '60%' },
  heroSkeletonLineNarrow: { width: '40%' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addLabel: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  summaryBlock: {
    paddingBottom: 12,
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 4,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 15,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 260,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 6,
  },
  emptyCtaLabel: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 13,
    letterSpacing: -0.1,
  },

  listFooter: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 8,
  },
  listFooterText: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 12,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  centeredTitle: {
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
    textAlign: 'center',
    marginTop: 4,
  },
  centeredDesc: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
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
