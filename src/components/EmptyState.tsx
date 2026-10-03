import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ActionButton from './ActionButton';
import { colors, common, radius } from './theme';

export default function EmptyState({ icon = 'file-tray-outline', title, description, actionLabel, onAction }: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return <View style={[common.card, { alignItems: 'center', paddingVertical: 30, marginTop: 8 }]}>
    <View style={{ width: 54, height: 54, borderRadius: radius.input, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
      <Ionicons name={icon} size={27} color={colors.greenDark} />
    </View>
    <Text style={[common.heading, { textAlign: 'center' }]}>{title}</Text>
    <Text style={[common.muted, { textAlign: 'center', marginTop: 6, marginBottom: onAction ? 16 : 0 }]}>{description}</Text>
    {actionLabel && onAction ? <ActionButton label={actionLabel} onPress={onAction} variant="secondary" /> : null}
  </View>;
}
