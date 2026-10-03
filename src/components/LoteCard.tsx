import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lote } from '../types/lote';
import { diasRestantes, formatarData, validadeDoLote } from '../utils/formatters';
import NivelVencimentoBadge from './NivelVencimentoBadge';
import { colors, common, radius } from './theme';

export default function LoteCard({ lote, onPress }: { lote: Lote; onPress: () => void }): React.JSX.Element {
  const dias = diasRestantes(lote);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir lote ${lote.nome_lote}`} onPress={onPress} style={({ pressed }) => [common.card, pressed && { backgroundColor: colors.greenSoft }]}>
    <View style={[common.row, { alignItems: 'flex-start', gap: 10 }]}>
      <View style={{ width: 44, height: 44, borderRadius: radius.input, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="calendar-outline" size={22} color={colors.greenDark} /></View>
      <View style={{ flex: 1 }}><Text style={common.heading} numberOfLines={2}>{lote.produto_nome}</Text><Text style={common.muted}>{lote.nome_lote}</Text></View>
      <NivelVencimentoBadge nivel={lote.nivel_vencimento} />
    </View>
    <View style={[common.row, { marginTop: 15, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13 }]}>
      <View><Text style={common.eyebrow}>VALIDADE</Text><Text style={[common.body, { fontWeight: '700', marginTop: 3 }]}>{formatarData(validadeDoLote(lote))}</Text></View>
      <View style={{ alignItems: 'flex-end' }}><Text style={common.eyebrow}>ESTOQUE</Text><Text style={[common.body, { fontWeight: '700', marginTop: 3 }]}>{lote.quantidade} un.</Text></View>
    </View>
    <Text style={[common.muted, { marginTop: 10 }]}>{dias === null ? 'Prazo não informado' : dias < 0 ? `Vencido há ${-dias} dia(s)` : `${dias} dia(s) restantes`}</Text>
  </Pressable>;
}
