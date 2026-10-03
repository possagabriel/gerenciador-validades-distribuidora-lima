import { Text, View } from 'react-native';
import { colors, common, spacing } from './theme';

export default function ScreenHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }): React.JSX.Element {
  return <View style={{ marginBottom: spacing.xl }}>
    {eyebrow ? <Text style={[common.eyebrow, { marginBottom: spacing.sm }]}>{eyebrow}</Text> : null}
    <Text style={common.title}>{title}</Text>
    {subtitle ? <Text style={[common.body, { color: colors.muted, marginTop: 8 }]}>{subtitle}</Text> : null}
  </View>;
}
