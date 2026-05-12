import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DATABASE_NAME } from '@/lib/db';
import { runMigrations } from '@/lib/migrations';
import { runInitSeeders } from '@/lib/seeders';

export const unstable_settings = {
  anchor: '(tabs)',
};

async function initDb(db: SQLiteDatabase) {
  await runMigrations(db);
  await runInitSeeders(db);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDb}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
