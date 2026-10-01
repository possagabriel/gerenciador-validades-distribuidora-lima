import { ActivityIndicator, Text, View } from 'react-native';
import { colors } from './theme';

export default function LoadingState({ label = 'Carregando…' }: { label?: string }): React.JSX.Element {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <ActivityIndicator size="large" color={colors.green} /><Text style={{ color: colors.muted, marginTop: 12 }}>{label}</Text>
  </View>;
}
