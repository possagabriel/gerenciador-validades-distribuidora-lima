import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, common, spacing } from './theme';

export default function RefreshNotice({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return <Pressable accessibilityRole="button" accessibilityLabel="Dados não atualizados. Tentar novamente" onPress={onRetry}
    style={({ pressed }) => [common.card, { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      backgroundColor: colors.amberSoft, borderColor: colors.amberSoft }, pressed && { opacity: 0.75 }]}>
    <Ionicons name="refresh-outline" size={22} color={colors.amber} />
    <View style={{ flex: 1 }}>
      <Text style={[common.body, { color: colors.amber, fontWeight: '700' }]}>Dados não atualizados</Text>
      <Text style={[common.muted, { color: colors.amber }]}>Toque para tentar novamente</Text>
    </View>
  </Pressable>;
}
