import { Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CodeCamera from './CodeCamera';
import { colors, spacing, type } from './theme';

export default function CodeScannerModal({ visible, onClose, onCode }: {
  visible: boolean;
  onClose: () => void;
  onCode: (code: string) => void;
}): React.JSX.Element | null {
  if (!visible) return null;
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, padding: spacing.lg, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={{ color: colors.ink, fontSize: type.section, fontWeight: '700' }}>Ler QR ou código de barras</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar câmera" onPress={onClose}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={26} color={colors.greenDark} />
        </Pressable>
      </View>
      <CodeCamera style={{ flex: 1 }} onCode={code => { onCode(code); onClose(); }} />
      <Text style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.md }}>
        Centralize o código. A leitura acontece automaticamente.
      </Text>
    </SafeAreaView>
  </Modal>;
}
