import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontFamilies, Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type MediaLibraryPickerSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export type MediaLibraryPickerSheetProps = {
  onPick: (uri: string) => void;
};

type LoadState =
  | { kind: 'idle' }
  | { kind: 'requesting-permission' }
  | { kind: 'denied'; canAskAgain: boolean }
  | { kind: 'loading'; assets: MediaLibrary.Asset[]; endCursor?: string }
  | { kind: 'ready'; assets: MediaLibrary.Asset[]; endCursor?: string; hasMore: boolean };

const PAGE_SIZE = 60;
const NUM_COLUMNS = 3;
const GUTTER = 2;
const HORIZONTAL_PADDING = 16;

export const MediaLibraryPickerSheet = forwardRef<
  MediaLibraryPickerSheetRef,
  MediaLibraryPickerSheetProps
>(function MediaLibraryPickerSheet({ onPick }, ref) {
  const modalRef = useRef<BottomSheetModal>(null);
  const scheme = useColorScheme() ?? 'light';
  const theme = Theme[scheme];

  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  const presentSheet = useCallback(async () => {
    modalRef.current?.present();
    setState({ kind: 'requesting-permission' });
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) {
      setState({ kind: 'denied', canAskAgain: perm.canAskAgain });
      return;
    }
    setState({ kind: 'loading', assets: [] });
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      first: PAGE_SIZE,
      sortBy: ['creationTime'],
    });
    setState({
      kind: 'ready',
      assets: page.assets,
      endCursor: page.endCursor,
      hasMore: page.hasNextPage,
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      present() {
        void presentSheet();
      },
      dismiss() {
        modalRef.current?.dismiss();
      },
    }),
    [presentSheet]
  );

  const loadMore = useCallback(async () => {
    if (state.kind !== 'ready' || !state.hasMore) return;
    setState({ kind: 'loading', assets: state.assets, endCursor: state.endCursor });
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      first: PAGE_SIZE,
      after: state.endCursor,
      sortBy: ['creationTime'],
    });
    setState({
      kind: 'ready',
      assets: [...state.assets, ...page.assets],
      endCursor: page.endCursor,
      hasMore: page.hasNextPage,
    });
  }, [state]);

  const handlePick = useCallback(
    async (asset: MediaLibrary.Asset) => {
      // On iOS, asset.uri is `ph://...` which `expo-image` handles for display
      // but the consumer may want a stable local URI. Resolve via getAssetInfoAsync.
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        const uri = info.localUri ?? asset.uri;
        onPick(uri);
        modalRef.current?.dismiss();
      } catch (err) {
        console.warn('Failed to resolve asset', err);
        onPick(asset.uri);
        modalRef.current?.dismiss();
      }
    },
    [onPick]
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

  const renderItem = useCallback(
    ({ item }: { item: MediaLibrary.Asset }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Selecionar foto"
        onPress={() => handlePick(item)}
        style={({ pressed }) => [
          styles.cell,
          { opacity: pressed ? 0.7 : 1, backgroundColor: theme.muted },
        ]}
      >
        <Image source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" />
      </Pressable>
    ),
    [handlePick, theme.muted]
  );

  const renderEmpty = useCallback(() => {
    if (state.kind === 'requesting-permission' || state.kind === 'loading') {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.foreground} />
        </View>
      );
    }
    if (state.kind === 'denied') {
      return (
        <View style={styles.center}>
          <View
            style={[
              styles.medallion,
              {
                backgroundColor: theme.destructiveSurface,
                borderColor: theme.destructiveBorder,
              },
            ]}
          >
            <IconSymbol name="alert-triangle" size={22} color={theme.destructive} />
          </View>
          <Text style={[styles.title, { color: theme.foreground }]}>Permissão necessária</Text>
          <Text style={[styles.desc, { color: theme.mutedForeground }]}>
            Para escolher uma foto, permita o acesso às suas fotos nas configurações.
          </Text>
          {state.canAskAgain ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir configurações"
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: pressed ? theme.accent : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: theme.foreground }]}>
                Abrir configurações
              </Text>
            </Pressable>
          )}
        </View>
      );
    }
    if (state.kind === 'ready' && state.assets.length === 0) {
      return (
        <View style={styles.center}>
          <View
            style={[styles.medallion, { backgroundColor: theme.muted, borderColor: theme.border }]}
          >
            <IconSymbol name="pawprint.fill" size={22} color={theme.foreground} />
          </View>
          <Text style={[styles.title, { color: theme.foreground }]}>Sem fotos no dispositivo</Text>
          <Text style={[styles.desc, { color: theme.mutedForeground }]}>
            Adicione fotos ao seu dispositivo e tente novamente.
          </Text>
        </View>
      );
    }
    return null;
  }, [state, theme]);

  const renderFooter = useCallback(() => {
    if (state.kind !== 'loading' || state.assets.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.mutedForeground} />
      </View>
    );
  }, [state, theme.mutedForeground]);

  const assets = state.kind === 'ready' || state.kind === 'loading' ? state.assets : [];

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={['80%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.card, borderRadius: 16 }}
      handleComponent={() => (
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>
      )}
      onDismiss={() => {
        // Reset on dismiss so the next present() refetches fresh.
        setState({ kind: 'idle' });
      }}
    >
      <View style={[styles.titleRow, { borderBottomColor: theme.border }]}>
        <Text
          style={[
            styles.titleLabel,
            { color: theme.mutedForeground, fontFamily: FontFamilies.mono.medium },
          ]}
        >
          ESCOLHER FOTO
        </Text>
      </View>

      <BottomSheetFlatList
        data={assets}
        keyExtractor={(a) => a.id}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    </BottomSheetModal>
  );
});

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
  titleLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  row: {
    gap: GUTTER,
    marginBottom: GUTTER,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    gap: 12,
  },
  medallion: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontFamily: FontFamilies.sans.semibold,
    fontSize: 16,
    letterSpacing: -0.2,
    textAlign: 'center',
    marginTop: 4,
  },
  desc: {
    fontFamily: FontFamilies.sans.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  buttonLabel: {
    fontFamily: FontFamilies.sans.medium,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
