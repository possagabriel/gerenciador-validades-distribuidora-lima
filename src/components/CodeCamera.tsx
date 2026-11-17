import { useRef, useState } from 'react';
import { Linking, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from 'expo-camera';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import { colors, radius, spacing } from './theme';

const barcodeTypes: BarcodeType[] = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128'];

export default function CodeCamera({ onCode, style }: { onCode: (code: string) => void; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);

  if (!permission) return <LoadingState label="Verificando câmera…" />;
  if (!permission.granted) return <View style={style}>
    <EmptyState icon="camera-outline" title="Permita o uso da câmera"
      description="A câmera lê QR codes e códigos de barras sem digitar."
      actionLabel={permission.canAskAgain ? 'Permitir câmera' : 'Abrir configurações'}
      onAction={() => { void (permission.canAskAgain ? requestPermission() : Linking.openSettings()); }} />
  </View>;

  const onScan = (result: BarcodeScanningResult) => {
    if (locked.current) return;
    const code = result.data.trim();
    if (!code) return;
    locked.current = true;
    if (code.length > 50) {
      setError('Este QR contém mais de 50 caracteres. Use um código curto do produto.');
      return;
    }
    onCode(code);
  };

  return <View style={[{ minHeight: 280, borderRadius: radius.feature, overflow: 'hidden', backgroundColor: colors.greenDark }, style]}>
    <CameraView style={{ flex: 1 }} facing="back" enableTorch={torch}
      barcodeScannerSettings={{ barcodeTypes }} onBarcodeScanned={onScan} />
    <View pointerEvents="none" style={{ position: 'absolute', left: 28, right: 28, top: '33%', height: 130,
      borderWidth: 2, borderColor: colors.white, borderRadius: radius.card }} />
    <Pressable accessibilityRole="button" accessibilityLabel={torch ? 'Desligar lanterna' : 'Ligar lanterna'}
      onPress={() => setTorch(value => !value)}
      style={{ position: 'absolute', right: spacing.base, bottom: spacing.base, minWidth: 48, minHeight: 48,
        borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenDark }}>
      <Ionicons name={torch ? 'flash' : 'flash-outline'} size={24} color={colors.white} />
    </Pressable>
    {error ? <View style={{ position: 'absolute', left: spacing.base, right: spacing.base, bottom: 76,
      padding: spacing.base, borderRadius: radius.card, backgroundColor: colors.white }}>
      <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: spacing.sm }}>{error}</Text>
      <Pressable accessibilityRole="button" onPress={() => { locked.current = false; setError(''); }}>
        <Text style={{ color: colors.greenDark, fontWeight: '700' }}>Tentar outro código</Text>
      </Pressable>
    </View> : null}
  </View>;
}
