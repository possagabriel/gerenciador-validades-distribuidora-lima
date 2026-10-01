import { Pressable, Text, View } from 'react-native';
import { common } from './theme';

export default function ErrorState({ message = 'Não foi possível carregar os dados.', onRetry }: { message?: string; onRetry: () => void }): React.JSX.Element {
  return <View style={{ padding: 20, alignItems: 'center' }}>
    <Text style={common.body}>{message}</Text>
    <Pressable accessibilityRole="button" onPress={onRetry} style={common.button}><Text style={common.buttonText}>Tentar novamente</Text></Pressable>
  </View>;
}
