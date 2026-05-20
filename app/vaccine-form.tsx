import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/form/input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSQLiteContext } from '@/lib/db';
import type { Vaccine } from '@/lib/db-types';
import { formatCurrencyCents, formatDate, parseCurrencyInput, parseDateInput } from '@/lib/utils/format';

type FormState = {
  name: string;
  dateGivenInput: string;
  amountInput: string;
  nextDueDateInput: string;
};

type Mode = 'create' | 'edit';

type Status = 'idle' | 'loading' | 'submitting' | 'pet-not-found' | 'vaccine-not-found';

type FieldError = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  name: '',
  dateGivenInput: '',
  amountInput: '',
  nextDueDateInput: '',
};

const AUTO_DISMISS_MS = 1500;

export default function VaccineFormScreen() {
  const params = useLocalSearchParams<{ petId?: string; id?: string }>();
  const petId = params.petId ? Number.parseInt(params.petId, 10) : NaN;
  const editIdRaw = params.id ? Number.parseInt(params.id, 10) : null;
  const editId = editIdRaw !== null && Number.isFinite(editIdRaw) ? editIdRaw : null;
  const validPetId = Number.isFinite(petId);
  const mode: Mode = editId !== null ? 'edit' : 'create';

  const db = useSQLiteContext();
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];

  const [petName, setPetName] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<Status>(validPetId ? 'loading' : 'pet-not-found');
  const [errors, setErrors] = useState<FieldError>({});

  const nameRef = useRef<TextInput>(null);
  const dateGivenRef = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);
  const nextDueRef = useRef<TextInput>(null);

  // Load pet (always) and vaccine (if editing).
  useEffect(() => {
    if (!validPetId) {
      setStatus('pet-not-found');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const pet = await db.getFirstAsync<{ id: number; name: string }>(
          'SELECT id, name FROM pets WHERE id = ?',
          petId
        );
        if (cancelled) return;
        if (!pet) {
          setStatus('pet-not-found');
          return;
        }
        setPetName(pet.name);

        if (editId === null) {
          setStatus('idle');
          return;
        }

        const row = await db.getFirstAsync<Vaccine>(
          'SELECT id, pet_id, name, date_given, amount_paid_cents, next_due_date, created_at FROM vaccines WHERE id = ?',
          editId
        );
        if (cancelled) return;
        if (!row) {
          setStatus('vaccine-not-found');
          return;
        }
        setForm({
          name: row.name,
          dateGivenInput: formatDate(row.date_given),
          amountInput: formatCurrencyCents(row.amount_paid_cents),
          nextDueDateInput: formatDate(row.next_due_date),
        });
        setStatus('idle');
      } catch (err) {
        if (cancelled) return;
        console.warn('Failed to load vaccine form', err);
        Alert.alert('Erro', 'Não foi possível carregar os dados.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, editId, petId, validPetId]);

  // Auto-dismiss on fatal states.
  useEffect(() => {
    if (status === 'pet-not-found' || status === 'vaccine-not-found') {
      const t = setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, AUTO_DISMISS_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [status]);

  const trimmedName = form.name.trim();

  const requiredReady = trimmedName.length > 0 && form.dateGivenInput.trim().length > 0;
  const isValidEnough =
    mode === 'edit'
      ? status === 'idle' || status === 'submitting'
      : requiredReady && status === 'idle';

  const validate = (): {
    ok: boolean;
    errors: FieldError;
    isoDate: string | null;
    amountCents: number | null;
    nextIso: string | null;
  } => {
    const e: FieldError = {};

    if (!trimmedName) e.name = 'Informe o nome da vacina.';
    else if (trimmedName.length > 100) e.name = 'Nome muito longo (máximo 100 caracteres).';

    const isoDate = parseDateInput(form.dateGivenInput);
    if (!form.dateGivenInput.trim()) {
      e.dateGivenInput = 'Informe a data administrada.';
    } else if (!isoDate) {
      e.dateGivenInput = 'Data inválida. Use dd/mm/aaaa.';
    } else {
      const [yyyy, mm, dd] = isoDate.split('-').map(Number);
      const parsed = new Date(yyyy, mm - 1, dd);
      if (parsed.getTime() > Date.now()) {
        e.dateGivenInput = 'A data não pode estar no futuro.';
      }
    }

    let amountCents: number | null = null;
    if (form.amountInput.trim()) {
      amountCents = parseCurrencyInput(form.amountInput);
      if (amountCents === null) e.amountInput = 'Valor inválido.';
    }

    let nextIso: string | null = null;
    if (form.nextDueDateInput.trim()) {
      nextIso = parseDateInput(form.nextDueDateInput);
      if (!nextIso) {
        e.nextDueDateInput = 'Data inválida. Use dd/mm/aaaa.';
      } else if (isoDate && nextIso <= isoDate) {
        e.nextDueDateInput = 'A próxima dose deve ser depois da data administrada.';
      }
    }

    return {
      ok: Object.keys(e).length === 0,
      errors: e,
      isoDate,
      amountCents,
      nextIso,
    };
  };

  const submit = async () => {
    if (!validPetId) return;
    const result = validate();
    setErrors(result.errors);
    if (!result.ok || !result.isoDate) return;
    setStatus('submitting');
    try {
      await db.withTransactionAsync(async () => {
        if (mode === 'create') {
          await db.runAsync(
            'INSERT INTO vaccines (pet_id, name, date_given, amount_paid_cents, next_due_date) VALUES (?, ?, ?, ?, ?)',
            petId,
            trimmedName,
            result.isoDate,
            result.amountCents,
            result.nextIso
          );
        } else if (editId !== null) {
          await db.runAsync(
            'UPDATE vaccines SET name = ?, date_given = ?, amount_paid_cents = ?, next_due_date = ? WHERE id = ?',
            trimmedName,
            result.isoDate,
            result.amountCents,
            result.nextIso,
            editId
          );
        }
      });
      router.back();
    } catch (err) {
      console.warn('Vaccine submit failed', err);
      setStatus('idle');
      Alert.alert(
        'Erro',
        mode === 'create'
          ? 'Não foi possível salvar a vacina. Tente novamente.'
          : 'Não foi possível atualizar a vacina. Tente novamente.'
      );
    }
  };

  const cancel = () => router.back();

  const headerTitle = mode === 'create' ? 'Nova vacina' : 'Editar vacina';
  const saveLabel =
    status === 'submitting' ? 'Salvando…' : mode === 'create' ? 'Salvar' : 'Salvar alterações';

  const fatal = status === 'pet-not-found' || status === 'vaccine-not-found';

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          hitSlop={12}
          onPress={cancel}
          disabled={status === 'submitting'}
          style={({ pressed }) => [
            styles.cancelButton,
            { opacity: status === 'submitting' ? 0.6 : pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.cancelLabel, { color: theme.foreground }]}>Cancelar</Text>
        </Pressable>

        <Text style={[styles.headerTitle, { color: theme.foreground }]} numberOfLines={1}>
          {headerTitle}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
          accessibilityState={{ disabled: !isValidEnough }}
          hitSlop={8}
          onPress={submit}
          disabled={!isValidEnough || fatal}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: !isValidEnough || fatal ? theme.muted : theme.primary,
              opacity: pressed && isValidEnough ? 0.92 : 1,
              transform: pressed && isValidEnough ? [{ scale: 0.98 }] : [{ scale: 1 }],
            },
          ]}
        >
          {status === 'submitting' ? (
            <ActivityIndicator size="small" color={theme.primaryForeground} />
          ) : null}
          <Text
            style={[
              styles.saveLabel,
              {
                color: !isValidEnough || fatal ? theme.mutedForeground : theme.primaryForeground,
              },
            ]}
          >
            {saveLabel}
          </Text>
        </Pressable>
      </View>

      {fatal ? (
        <View style={styles.fatalContainer}>
          <View style={[styles.fatalCard, { borderColor: theme.destructive, backgroundColor: theme.destructiveSurface }]}>
            <IconSymbol name="exclamationmark.circle.fill" size={20} color={theme.destructive} />
            <Text style={[styles.fatalText, { color: theme.destructive }]}>
              {status === 'pet-not-found'
                ? 'Pet não encontrado.'
                : 'Vacina não encontrada.'}
            </Text>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={petName ? `Vacina para ${petName}` : 'Vacina'}
              importantForAccessibility="yes"
              style={[styles.chip, { backgroundColor: theme.accent, borderColor: theme.border }]}
            >
              <IconSymbol name="pawprint.fill" size={14} color={theme.mutedForeground} />
              <Text style={[styles.chipText, { color: theme.foreground }]} numberOfLines={1}>
                Para {petName ?? '…'}
              </Text>
            </View>

            <View style={styles.field}>
              <Input
                ref={nameRef}
                label="NOME DA VACINA *"
                accessibilityLabel="Nome da vacina, obrigatório"
                placeholder="ex.: Antirrábica"
                value={form.name}
                onChangeText={(v) => {
                  setForm((s) => ({ ...s, name: v }));
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                errorText={errors.name}
                disabled={status === 'submitting' || status === 'loading'}
                maxLength={100}
                returnKeyType="next"
                autoCapitalize="sentences"
                onSubmitEditing={() => dateGivenRef.current?.focus()}
              />
            </View>

            <View style={styles.field}>
              <Input
                ref={dateGivenRef}
                label="DATA ADMINISTRADA *"
                accessibilityLabel="Data administrada, obrigatório"
                placeholder="dd/mm/aaaa"
                value={form.dateGivenInput}
                onChangeText={(v) => {
                  setForm((s) => ({ ...s, dateGivenInput: v }));
                  if (errors.dateGivenInput)
                    setErrors((e) => ({ ...e, dateGivenInput: undefined }));
                }}
                errorText={errors.dateGivenInput}
                disabled={status === 'submitting' || status === 'loading'}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                returnKeyType="next"
                onSubmitEditing={() => amountRef.current?.focus()}
              />
            </View>

            <View style={styles.field}>
              <Input
                ref={amountRef}
                label="VALOR PAGO (OPCIONAL)"
                accessibilityLabel="Valor pago, opcional"
                placeholder="R$ 0,00"
                value={form.amountInput}
                onChangeText={(v) => {
                  setForm((s) => ({ ...s, amountInput: v }));
                  if (errors.amountInput) setErrors((e) => ({ ...e, amountInput: undefined }));
                }}
                errorText={errors.amountInput}
                helperText={errors.amountInput ? undefined : 'Opcional'}
                disabled={status === 'submitting' || status === 'loading'}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => nextDueRef.current?.focus()}
              />
            </View>

            <View style={styles.field}>
              <Input
                ref={nextDueRef}
                label="PRÓXIMA DOSE (OPCIONAL)"
                accessibilityLabel="Próxima dose, opcional"
                placeholder="dd/mm/aaaa"
                value={form.nextDueDateInput}
                onChangeText={(v) => {
                  setForm((s) => ({ ...s, nextDueDateInput: v }));
                  if (errors.nextDueDateInput)
                    setErrors((e) => ({ ...e, nextDueDateInput: undefined }));
                }}
                errorText={errors.nextDueDateInput}
                helperText={errors.nextDueDateInput ? undefined : 'Opcional'}
                disabled={status === 'submitting' || status === 'loading'}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (isValidEnough) void submit();
                }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  cancelButton: {
    minWidth: 64,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  cancelLabel: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  saveButton: {
    minWidth: 64,
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  saveLabel: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 18,
    maxWidth: '100%',
  },
  chipText: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  field: {
    marginBottom: 18,
  },
  fatalContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  fatalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fatalText: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 13,
    letterSpacing: -0.1,
    flex: 1,
  },
});
