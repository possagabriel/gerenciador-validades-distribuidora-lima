import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, common } from './theme';

export default function ErrorState({ message = 'Não foi possível carregar os dados.', onRetry }: { message?: string; onRetry: () => void }): React.JSX.Element {
  return <View style={[common.card, { margin: 20, alignItems: 'center', paddingVertical: 28 }]}>
    <Ionicons name="alert-circle-outline" size={30} color={colors.danger} style={{ marginBottom: 10 }} />
    <Text style={[common.heading, { textAlign: 'center' }]}>Algo não carregou</Text>
    <Text style={[common.muted, { textAlign: 'center', marginTop: 7, marginBottom: 15 }]}>{message}</Text>
    <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [common.button, pressed && { opacity: 0.78 }]}><Text style={common.buttonText}>Tentar novamente</Text></Pressable>
  </View>;
}
