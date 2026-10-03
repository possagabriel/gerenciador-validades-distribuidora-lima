import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
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
  const scanLocked = useRef(false);
  const query = useProdutoPorCodigo(codigo);
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();

  useEffect(() => {
    if (query.data) navigation.replace('ProdutoDetalhe', { id: query.data.id });
  }, [query.data, navigation]);

  if (!permission) return <LoadingState label="Verificando câmera…" />;
  if (!permission.granted) return <View style={common.page}>
    <ScreenHeading title="Ler código" subtitle="Use a câmera para encontrar um produto no catálogo." />
    <EmptyState icon="camera-outline" title="Permita o uso da câmera" description="A câmera é necessária para ler o código de barras do produto."
      actionLabel="Permitir câmera" onAction={() => void requestPermission()} />
  </View>;

  const onScan = (result: BarcodeScanningResult) => {
    if (scanLocked.current || !result.data) return;
    scanLocked.current = true;
    setCodigo(result.data);
  };
  const scanAgain = () => { scanLocked.current = false; setCodigo(null); };
  return <View style={[common.page, { paddingBottom: 20 }]}>
    <ScreenHeading title="Ler código" subtitle="Centralize o código de barras na área abaixo." />
    {!codigo ? <View style={{ flex: 1, minHeight: 280, borderRadius: radius.feature, overflow: 'hidden', backgroundColor: colors.greenDark }}>
      <CameraView style={{ flex: 1 }} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }} onBarcodeScanned={onScan} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 28, right: 28, top: '38%', height: 125,
        borderWidth: 2, borderColor: colors.white, borderRadius: radius.card }} />
    </View> : <View style={{ flex: 1 }}>
      <Text style={[common.muted, { marginBottom: 12 }]}>Código lido: {codigo}</Text>
      {query.isLoading ? <LoadingState label="Buscando produto…" /> : query.isError ?
        <ErrorState onRetry={() => void query.refetch()} /> : !query.data ?
          <EmptyState icon="search-outline" title="Produto não encontrado" description="Esse código ainda não está associado a um produto." /> : null}
    </View>}
    <Text style={[common.muted, { textAlign: 'center', marginTop: 14, marginBottom: 10 }]}>
      {codigo ? 'Você pode tentar outro código.' : 'A leitura acontece automaticamente.'}
    </Text>
    {codigo ? <ActionButton label="Ler outro código" variant="secondary" onPress={scanAgain} /> : null}
  </View>;
}
