import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CodeFormat } from '../tickets/types';
import { colors } from '../ui/theme';
import { useScanDebounce } from './useScanDebounce';

interface CameraScannerProps {
  /** Code formats to detect. */
  formats: CodeFormat[];
  /** Called with the decoded value and its format when a (debounced) scan lands. */
  onScan: (code: string, type: string) => void;
  /** When false, scans are ignored (e.g. while a result popup is open). */
  active: boolean;
  /** Ignore the same code if re-seen within this window. Default 1500ms. */
  debounceMs?: number;
  /** Overlay content rendered above the camera (result popup, toast, etc.). */
  children?: React.ReactNode;
}

/**
 * Reusable camera + barcode scanner. This is the ONLY component that touches
 * expo-camera — scan mode and ticket mode both build on it, so swapping the
 * underlying camera library would be contained here.
 */
export function CameraScanner({
  formats,
  onScan,
  active,
  debounceMs = 1500,
  children,
}: CameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const { accept } = useScanDebounce();

  const handleBarcode = useCallback(
    ({ data, type }: { data: string; type: string }) => {
      if (!active) return;
      if (!data) return;
      if (!accept(data, debounceMs)) return;
      onScan(data, type);
    },
    [active, accept, debounceMs, onScan],
  );

  if (!permission) {
    // Permission state still loading.
    return <View style={styles.fill} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>
          Open Ticket Scanner uses the camera to read QR codes and barcodes.
        </Text>
        <Pressable style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>
            {permission.canAskAgain ? 'Grant permission' : 'Open settings'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        // Default autofocus ('off') continuously refocuses as tickets move in/out.
        active={active}
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: formats as BarcodeType[] }}
        onBarcodeScanned={active ? handleBarcode : undefined}
      />
      <ScanReticle />
      <Pressable
        style={styles.torchButton}
        onPress={() => setTorch((t) => !t)}
        hitSlop={12}
        accessibilityLabel="Toggle flashlight"
      >
        <Text style={styles.torchIcon}>{torch ? '🔦' : '💡'}</Text>
      </Pressable>
      {children}
    </View>
  );
}

/** A simple framing reticle to aim the code at. */
function ScanReticle() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <View style={styles.reticle}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  permTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  permBody: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  permButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  torchButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchIcon: { fontSize: 22 },
  reticle: { width: 240, height: 240 },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
});
