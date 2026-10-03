import { Pressable, Text, View } from 'react-native';
import { colors, common } from './theme';

export default function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (page: number) => void;
}): React.JSX.Element | null {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return <View style={[common.card, common.row, { paddingVertical: 12, marginTop: 4 }]}>
    <Pressable accessibilityRole="button" disabled={page <= 1} onPress={() => onChange(page - 1)} style={{ minHeight: 44, minWidth: 72, justifyContent: 'center' }}>
      <Text style={{ color: page <= 1 ? colors.muted : colors.greenDark, fontWeight: '700' }}>Anterior</Text>
    </Pressable>
    <Text style={common.muted}>{page} de {pages}</Text>
    <Pressable accessibilityRole="button" disabled={page >= pages} onPress={() => onChange(page + 1)} style={{ minHeight: 44, minWidth: 72, justifyContent: 'center', alignItems: 'flex-end' }}>
      <Text style={{ color: page >= pages ? colors.muted : colors.greenDark, fontWeight: '700' }}>Próxima</Text>
    </Pressable>
  </View>;
}
