import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useT } from '../src/i18n';
import { colors } from '../src/ui/theme';

export default function RootLayout() {
  const t = useT();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
            // Back button shows only the chevron — no "previous title" label.
            headerBackButtonDisplayMode: 'minimal',
            headerBackTitle: '',
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Open Ticket Scanner' }} />
          <Stack.Screen name="scan" options={{ title: t('nav.scan') }} />
          <Stack.Screen name="history" options={{ title: t('nav.history') }} />
          <Stack.Screen name="settings" options={{ title: t('nav.settings') }} />
          <Stack.Screen name="about" options={{ title: t('nav.about') }} />
          <Stack.Screen name="tickets/configs/index" options={{ title: t('nav.configs') }} />
          <Stack.Screen name="tickets/configs/[id]" options={{ title: t('nav.config') }} />
          <Stack.Screen name="tickets/[configId]/scan" options={{ headerShown: false }} />
          <Stack.Screen name="configure" options={{ title: t('nav.addConfig') }} />
          <Stack.Screen name="configure-scan" options={{ headerShown: false }} />
          <Stack.Screen name="share/[configId]" options={{ title: t('nav.shareConfig') }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
