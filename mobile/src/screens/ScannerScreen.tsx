import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProdutoPorCodigo } from '../hooks/useProdutos';
import type { ProductsStackParams } from '../navigation/types';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { common } from '../components/theme';

export default function ScannerScreen(): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [codigo, setCodigo] = useState<string | null>(null);
  const query = useProdutoPorCodigo(codigo);
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();

  useEffect(() => {
    if (query.data) navigation.replace('ProdutoDetalhe', { id: query.data.id });
  }, [query.data, navigation]);

  if (!permission) return <LoadingState label="Verificando câmera…" />;
  if (!permission.granted) return <View style={common.page}><Text style={common.body}>Permita o uso da câmera para ler o código de barras.</Text>
    <Pressable style={common.button} onPress={() => void requestPermission()}><Text style={common.buttonText}>Permitir câmera</Text></Pressable></View>;

  const onScan = (result: BarcodeScanningResult) => { if (!codigo) setCodigo(result.data); };
  return <View style={common.page}>
    {!codigo && <CameraView style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }} facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }} onBarcodeScanned={onScan} />}
    {codigo && (query.isLoading ? <LoadingState label={`Buscando ${codigo}…`} /> : query.isError ?
      <ErrorState onRetry={() => void query.refetch()} /> : !query.data ? <Text style={common.body}>Código {codigo} não encontrado.</Text> : null)}
    {codigo && <Pressable onPress={() => setCodigo(null)} style={common.button}><Text style={common.buttonText}>Ler outro código</Text></Pressable>}
  </View>;
}
