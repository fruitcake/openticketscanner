import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../src/ui/theme';

export default function RootLayout() {
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
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Open Ticket Scanner' }} />
          <Stack.Screen name="scan" options={{ title: 'Scan Mode' }} />
          <Stack.Screen name="history" options={{ title: 'Scan History' }} />
          <Stack.Screen name="tickets/configs/index" options={{ title: 'Configurations' }} />
          <Stack.Screen name="tickets/configs/[id]" options={{ title: 'Configuration' }} />
          <Stack.Screen name="tickets/[configId]/scan" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
