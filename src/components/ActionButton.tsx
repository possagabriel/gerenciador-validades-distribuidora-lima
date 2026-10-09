import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, common } from './theme';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

export default function ActionButton({ label, onPress, variant = 'primary', disabled = false, loading = false, icon, style }: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const foreground = variant === 'primary' || variant === 'danger' ? colors.white : colors.greenDark;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [common.button, variant === 'secondary' && { backgroundColor: colors.greenSoft }, variant === 'quiet' && { backgroundColor: 'transparent' }, variant === 'danger' && { backgroundColor: colors.danger },
      (disabled || loading) && { opacity: 0.55 }, pressed && { opacity: 0.78 }, style]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {loading ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}
      <Text style={[common.buttonText, { color: foreground }]}>{label}</Text>
    </View>
  </Pressable>;
}
