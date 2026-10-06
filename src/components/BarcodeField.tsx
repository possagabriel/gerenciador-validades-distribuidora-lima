import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { colors, common, radius } from './theme';

interface BarcodeFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}

export default function BarcodeField({ label, value, onChangeText }: BarcodeFieldProps): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraAberta, setCameraAberta] = useState(false);
  const [lanterna, setLanterna] = useState(false);
  const isFocused = useIsFocused();
  const [erro, setErro] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const leituraBloqueada = useRef(false);

  const alternarCamera = async () => {
    if (cameraAberta) { setCameraAberta(false); setLanterna(false); return; }
    const autorizacao = permission?.granted ? permission : await requestPermission();
    if (!autorizacao.granted) {
      setErro('Permita o uso da câmera nas configurações ou digite o código.');
      return;
    }
    leituraBloqueada.current = false;
    setErro('');
    setConfirmacao('');
    setCameraAberta(true);
  };

  const aoLer = (result: BarcodeScanningResult) => {
    if (leituraBloqueada.current) return;
    const codigo = result.data.trim();
    if (!codigo) return;
    leituraBloqueada.current = true;
    setCameraAberta(false);
    setLanterna(false);
    if (codigo.length > 50) {
      setErro('O código lido tem mais de 50 caracteres.');
      return;
    }
    onChangeText(codigo);
    setErro('');
    setConfirmacao('Código reconhecido pela câmera. Confira antes de salvar.');
  };

  return <View>
    <TextInput accessibilityLabel={label} placeholder="Digite ou leia o código" value={value}
      onChangeText={text => { onChangeText(text); setConfirmacao(''); }}
      autoCapitalize="none" autoCorrect={false} maxLength={50} style={common.input} />
    <Pressable accessibilityRole="button" onPress={() => void alternarCamera()}
      style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ color: colors.greenDark, fontWeight: '700' }}>{cameraAberta ? 'Fechar câmera' : 'Ler com câmera'}</Text>
    </Pressable>
    {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 8 }}>{erro}</Text> : null}
    {confirmacao ? <Text accessibilityLiveRegion="polite" style={{ color: colors.greenDark, marginBottom: 8 }}>{confirmacao}</Text> : null}
    {cameraAberta && isFocused ? <View style={{ height: 240, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.greenDark }}>
      <CameraView style={{ flex: 1 }} facing="back" enableTorch={lanterna}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={aoLer} />
      <Pressable accessibilityRole="button" accessibilityLabel={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'}
        onPress={() => setLanterna(value => !value)}
        style={{ position: 'absolute', right: 12, bottom: 12, minHeight: 44, justifyContent: 'center',
          backgroundColor: colors.greenSoft, borderRadius: radius.input, paddingHorizontal: 14 }}>
        <Text style={{ color: colors.greenDark, fontWeight: '700' }}>{lanterna ? 'Desligar lanterna' : 'Ligar lanterna'}</Text>
      </Pressable>
    </View> : null}
  </View>;
}
