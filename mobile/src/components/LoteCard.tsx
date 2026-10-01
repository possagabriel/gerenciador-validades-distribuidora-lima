import { Pressable, Text, View } from 'react-native';
import type { Lote } from '../types/lote';
import { diasRestantes, formatarData, validadeDoLote } from '../utils/formatters';
import NivelVencimentoBadge from './NivelVencimentoBadge';
import { common } from './theme';

export default function LoteCard({ lote, onPress }: { lote: Lote; onPress: () => void }): React.JSX.Element {
  const dias = diasRestantes(lote);
  return <Pressable accessibilityRole="button" onPress={onPress} style={common.card}>
    <View style={common.row}><Text style={common.heading}>{lote.produto_nome}</Text><NivelVencimentoBadge nivel={lote.nivel_vencimento} /></View>
    <Text style={common.muted}>{lote.nome_lote} · {lote.quantidade} unidade(s)</Text>
    <Text style={common.body}>Validade: {formatarData(validadeDoLote(lote))}</Text>
    <Text style={common.muted}>{dias === null ? 'Prazo não informado' : dias < 0 ? `Vencido há ${-dias} dia(s)` : `${dias} dia(s) restantes`}</Text>
  </Pressable>;
}
