import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Produto } from '../types/produto';
import { formatarMoeda } from '../utils/formatters';
import { colors, common, radius } from './theme';

export default function ProdutoCard({ produto, onPress }: { produto: Produto; onPress: () => void }): React.JSX.Element {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${produto.nome}`} onPress={onPress} style={({ pressed }) => [common.card, pressed && { backgroundColor: colors.greenSoft }]}>
    <View style={[common.row, { gap: 12 }]}>
      <View style={{ width: 44, height: 44, borderRadius: radius.input, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="cube-outline" size={22} color={colors.greenDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={common.heading} numberOfLines={2}>{produto.nome}</Text>
        <Text style={[common.muted, { marginTop: 2 }]}>{produto.categoria_nome || 'Sem categoria'} · {produto.skus.length} {produto.skus.length === 1 ? 'código' : 'códigos'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </View>
    <Text style={{ color: colors.greenDark, fontSize: 18, fontWeight: '800', marginTop: 10, marginLeft: 56 }}>{formatarMoeda(produto.preco_venda)}</Text>
  </Pressable>;
}
