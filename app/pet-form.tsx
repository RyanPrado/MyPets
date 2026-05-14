import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { PhotoUploadCircle } from '@/components/photo-upload-circle';
import { SpeciesPickerSheet, type SpeciesPickerSheetRef } from '@/components/species-picker-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type Species } from '@/lib/constants/species';
import { useSQLiteContext } from '@/lib/db';
import type { Pet } from '@/lib/db-types';

type FormState = {
  name: string;
  species: Species | null;
  birthDateInput: string; // dd/mm/aaaa as typed
  photoUri: string | null;
};

type Mode = 'create' | 'edit';

type Status = 'idle' | 'loading' | 'submitting';

const EMPTY_FORM: FormState = {
  name: '',
  species: null,
  birthDateInput: '',
  photoUri: null,
};

export default function PetFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const idParam = params.id;
  const editId = idParam ? Number.parseInt(idParam, 10) : null;
  const mode: Mode = editId && Number.isFinite(editId) ? 'edit' : 'create';

  const db = useSQLiteContext();
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<Status>(mode === 'edit' ? 'loading' : 'idle');
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const nameRef = useRef<TextInput>(null);
  const dateRef = useRef<TextInput>(null);
  const speciesSheetRef = useRef<SpeciesPickerSheetRef>(null);

  const cancel = () => router.back();

  const trimmedName = form.name.trim();

  const validateForSubmit = useCallback((): {
    ok: boolean;
    errors: Partial<Record<keyof FormState, string>>;
    isoDate: string | null;
  } => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!trimmedName) e.name = 'Informe o nome do pet.';
    else if (trimmedName.length > 100) e.name = 'Nome muito longo (máximo 100 caracteres).';

    if (!form.species) e.species = 'Selecione a espécie.';

    let isoDate: string | null = null;
    const raw = form.birthDateInput.trim();
    if (raw) {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
      if (!m) {
        e.birthDateInput = 'Formato inválido. Use dd/mm/aaaa.';
      } else {
        const [, dd, mm, yyyy] = m;
        const day = Number(dd);
        const month = Number(mm);
        const year = Number(yyyy);
        const parsed = new Date(year, month - 1, day);
        const valid =
          parsed.getFullYear() === year &&
          parsed.getMonth() === month - 1 &&
          parsed.getDate() === day;
        if (!valid) {
          e.birthDateInput = 'Formato inválido. Use dd/mm/aaaa.';
        } else if (parsed.getTime() > Date.now()) {
          e.birthDateInput = 'A data não pode ser no futuro.';
        } else {
          isoDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
      }
    }

    return { ok: Object.keys(e).length === 0, errors: e, isoDate };
  }, [trimmedName, form.species, form.birthDateInput]);

  // Save button is enabled when the two required fields are present.
  // Birth-date / photo errors surface only on submit.
  const isValid =
    mode === 'edit'
      ? status !== 'loading'
      : trimmedName.length > 0 && trimmedName.length <= 100 && !!form.species;

  useEffect(() => {
    if (mode !== 'edit' || editId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await db.getFirstAsync<Pet>(
          'SELECT id, name, species, birth_date, photo_uri, created_at FROM pets WHERE id = ?',
          editId
        );
        if (cancelled) return;
        if (!row) {
          Alert.alert('Pet não encontrado', 'Este pet foi removido. A tela vai fechar.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        const displayDate = row.birth_date
          ? (() => {
              const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.birth_date!);
              return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
            })()
          : '';
        setForm({
          name: row.name,
          species: row.species,
          birthDateInput: displayDate,
          photoUri: row.photo_uri,
        });
        setStatus('idle');
      } catch (err) {
        if (cancelled) return;
        console.warn('Failed to load pet', err);
        Alert.alert('Erro', 'Não foi possível carregar este pet.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, editId, mode]);

  const submit = async () => {
    const { ok, errors: validationErrors, isoDate } = validateForSubmit();
    setErrors(validationErrors);
    if (!ok || !form.species) {
      return;
    }
    setStatus('submitting');
    try {
      if (mode === 'create') {
        await db.runAsync(
          'INSERT INTO pets (name, species, birth_date, photo_uri) VALUES (?, ?, ?, ?)',
          trimmedName,
          form.species,
          isoDate,
          form.photoUri
        );
      } else if (editId !== null) {
        await db.runAsync(
          'UPDATE pets SET name = ?, species = ?, birth_date = ?, photo_uri = ? WHERE id = ?',
          trimmedName,
          form.species,
          isoDate,
          form.photoUri,
          editId
        );
      }
      router.back();
    } catch (err) {
      console.warn('Submit failed', err);
      setStatus('idle');
      Alert.alert(
        'Erro',
        mode === 'create'
          ? 'Não foi possível salvar o pet. Tente novamente.'
          : 'Não foi possível atualizar o pet. Tente novamente.'
      );
    }
  };

  const headerTitle =
    mode === 'create' ? 'Novo pet' : form.name ? `Editar ${form.name}` : 'Editar pet';
  const saveLabel =
    status === 'submitting' ? 'Salvando…' : mode === 'create' ? 'Salvar' : 'Salvar alterações';

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
          accessibilityState={{ disabled: !isValid || status === 'submitting' }}
          hitSlop={8}
          onPress={submit}
          disabled={!isValid || status === 'submitting'}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: !isValid || status === 'submitting' ? theme.muted : theme.primary,
              opacity: pressed && isValid ? 0.92 : 1,
              transform: pressed && isValid ? [{ scale: 0.98 }] : [{ scale: 1 }],
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
                color:
                  !isValid || status === 'submitting'
                    ? theme.mutedForeground
                    : theme.primaryForeground,
              },
            ]}
          >
            {saveLabel}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.photoBlock}>
            <PhotoUploadCircle
              uri={form.photoUri}
              onChange={(uri) => setForm((s) => ({ ...s, photoUri: uri }))}
            />
          </View>

          <View style={styles.field}>
            <Input
              ref={nameRef}
              label="NOME"
              placeholder="ex.: Rex"
              value={form.name}
              onChangeText={(v) => {
                setForm((s) => ({ ...s, name: v }));
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              errorText={errors.name}
              disabled={status === 'submitting' || status === 'loading'}
              maxLength={100}
              returnKeyType="next"
              autoCapitalize="words"
              onSubmitEditing={() => speciesSheetRef.current?.present()}
            />
          </View>

          <View style={styles.field}>
            <Input
              label="ESPÉCIE"
              placeholder="Selecione a espécie"
              value=""
              onChangeText={() => undefined}
              displayValue={form.species ?? undefined}
              onPress={() => speciesSheetRef.current?.present()}
              accessibilityRole="combobox"
              accessibilityLabel="Espécie"
              accessibilityValue={{ text: form.species ?? 'Não selecionada' }}
              errorText={errors.species}
              disabled={status === 'submitting' || status === 'loading'}
              trailing={<IconSymbol name="chevron.down" size={16} color={theme.mutedForeground} />}
            />
          </View>

          <View style={styles.field}>
            <Input
              ref={dateRef}
              label="DATA DE NASCIMENTO"
              placeholder="dd/mm/aaaa"
              value={form.birthDateInput}
              onChangeText={(v) => {
                setForm((s) => ({ ...s, birthDateInput: v }));
                if (errors.birthDateInput) setErrors((e) => ({ ...e, birthDateInput: undefined }));
              }}
              errorText={errors.birthDateInput}
              helperText={errors.birthDateInput ? undefined : 'Opcional'}
              disabled={status === 'submitting' || status === 'loading'}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              returnKeyType="done"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SpeciesPickerSheet
        ref={speciesSheetRef}
        value={form.species}
        onChange={(next) => {
          setForm((s) => ({ ...s, species: next }));
          if (errors.species) setErrors((e) => ({ ...e, species: undefined }));
        }}
      />
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  photoBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  field: {
    marginBottom: 18,
  },
});
