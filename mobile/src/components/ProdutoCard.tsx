import { Pressable, Text, View } from 'react-native';
import type { Produto } from '../types/produto';
import { formatarMoeda } from '../utils/formatters';
import { common } from './theme';

export default function ProdutoCard({ produto, onPress }: { produto: Produto; onPress: () => void }): React.JSX.Element {
  return <Pressable accessibilityRole="button" onPress={onPress} style={common.card}>
    <View style={common.row}><Text style={common.heading}>{produto.nome}</Text><Text>›</Text></View>
    <Text style={common.muted}>{produto.categoria_nome} · {produto.skus.length} código(s)</Text>
    <Text style={common.body}>{formatarMoeda(produto.preco_venda)}</Text>
  </Pressable>;
}
