import { useEffect, useRef, useState } from 'react';
import { Keyboard, Linking, Text, TextInput, Vibration, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProdutoPorCodigo } from '../hooks/useProdutos';
import type { ProductsStackParams } from '../navigation/types';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, radius } from '../components/theme';

export default function ScannerScreen(): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [codigo, setCodigo] = useState<string | null>(null);
  const [entradaManual, setEntradaManual] = useState('');
  const [modoManual, setModoManual] = useState(false);
  const [origem, setOrigem] = useState<'camera' | 'manual'>('camera');
  const [lanterna, setLanterna] = useState(false);
  const [aviso, setAviso] = useState('');
  const scanLocked = useRef(false);
  const query = useProdutoPorCodigo(codigo);
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (query.data && isFocused) navigation.replace('ProdutoDetalhe', { id: query.data.id });
  }, [query.data, navigation, isFocused]);

  const onScan = (result: BarcodeScanningResult) => {
    const valor = result.data.trim();
    if (scanLocked.current || !valor) return;
    if (valor.length > 50) { setAviso('O código lido é longo demais. Tente outro.'); return; }
    scanLocked.current = true;
    Vibration.vibrate(80);
    setOrigem('camera');
    setAviso('');
    setLanterna(false);
    setCodigo(valor);
  };

  const buscarManual = () => {
    const valor = entradaManual.trim();
    if (!valor) { setAviso('Digite um código de barras para buscar.'); return; }
    scanLocked.current = true;
    setOrigem('manual');
    setAviso('');
    Keyboard.dismiss();
    setCodigo(valor);
  };

  const tentarOutro = (manual: boolean) => {
    scanLocked.current = false;
    setCodigo(null);
    setModoManual(manual);
    setLanterna(false);
    setAviso('');
    if (!manual) setEntradaManual('');
  };

  const cameraDisponivel = permission?.granted === true;
  return <View style={[common.page, { paddingBottom: 20 }]}>
    <ScreenHeading title="Ler código" subtitle="Use a câmera ou digite o código de barras." />
    {!codigo && !modoManual ? cameraDisponivel ? <View style={{ flex: 1, minHeight: 280, borderRadius: radius.feature, overflow: 'hidden', backgroundColor: colors.greenDark }}>
      {isFocused ? <CameraView style={{ flex: 1 }} facing="back" enableTorch={lanterna}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }} onBarcodeScanned={onScan} /> : null}
      <View pointerEvents="none" style={{ position: 'absolute', left: 28, right: 28, top: '38%', height: 125,
        borderWidth: 2, borderColor: colors.white, borderRadius: radius.card }} />
      <ActionButton label={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'} variant="secondary"
        onPress={() => setLanterna(value => !value)} style={{ position: 'absolute', right: 12, bottom: 12 }} />
    </View> : <View style={{ flex: 1 }}>
      {!permission ? <LoadingState label="Verificando câmera…" /> :
        <EmptyState icon="camera-outline" title="Câmera indisponível" description="Você também pode digitar o código de barras."
          actionLabel={permission.canAskAgain ? 'Permitir câmera' : 'Abrir configurações'}
          onAction={() => { if (permission.canAskAgain) void requestPermission(); else void Linking.openSettings(); }} />}
    </View> : null}
    {!codigo && modoManual ? <View style={{ flex: 1 }}>
      <Text style={[common.muted, { marginBottom: 8 }]}>Código de barras</Text>
      <TextInput accessibilityLabel="Digitar código de barras" value={entradaManual} onChangeText={setEntradaManual}
        placeholder="Digite o código" autoCapitalize="none" autoCorrect={false} maxLength={50}
        returnKeyType="search" onSubmitEditing={buscarManual} style={[common.input, { marginBottom: 12 }]} />
      <ActionButton label="Buscar código" onPress={buscarManual} />
      {cameraDisponivel ? <ActionButton label="Usar câmera" variant="secondary"
        onPress={() => { setModoManual(false); setAviso(''); }} style={{ marginTop: 10 }} /> : null}
    </View> : null}
    {codigo ? <View style={{ flex: 1 }}>
      <View style={[common.card, { backgroundColor: colors.greenSoft }]}>
        <Text accessibilityLiveRegion="polite" style={[common.heading, { color: colors.greenDark }]}>
          {origem === 'camera' ? 'Código reconhecido pela câmera' : 'Código informado'}
        </Text>
        <Text selectable style={[common.muted, { marginTop: 6 }]}>{codigo}</Text>
      </View>
      {query.isLoading ? <LoadingState label="Buscando produto…" /> : query.isError ?
        <ErrorState message="Não foi possível consultar este código." onRetry={() => void query.refetch()} /> : !query.data ?
          <EmptyState icon="search-outline" title="Produto não encontrado" description="O código foi lido, mas não está cadastrado. Confira os dígitos ou tente outro." /> : null}
    </View> : null}
    {aviso ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginTop: 12 }}>{aviso}</Text> : null}
    {!codigo && !modoManual ? <Text style={[common.muted, { textAlign: 'center', marginTop: 14, marginBottom: 10 }]}>A busca começa assim que a câmera reconhece o código.</Text> : null}
    {!codigo && !modoManual ? <ActionButton label="Digitar código" variant="secondary" onPress={() => { setModoManual(true); setAviso(''); }} /> : null}
    {codigo ? <View style={{ gap: 10 }}>
      {cameraDisponivel ? <ActionButton label="Ler outro código" variant="secondary" onPress={() => tentarOutro(false)} /> : null}
      <ActionButton label="Digitar outro código" variant={cameraDisponivel ? 'quiet' : 'secondary'} onPress={() => tentarOutro(true)} />
    </View> : null}
  </View>;
}
