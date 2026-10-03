import { ScrollView, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useLote } from '../hooks/useLotes';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import NivelVencimentoBadge from '../components/NivelVencimentoBadge';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common } from '../components/theme';
import { diasRestantes, formatarData, formatarMoeda, validadeDoLote } from '../utils/formatters';

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return <View style={[common.row, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }]}>
    <Text style={[common.muted, { flex: 1 }]}>{label}</Text>
    <Text style={[common.body, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{value}</Text>
  </View>;
}

export default function LoteDetalheScreen(): React.JSX.Element {
  const route = useRoute();
  const id = (route.params as { id: number }).id;
  const query = useLote(id);
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const lote = query.data;
  const dias = diasRestantes(lote);
  const prazo = dias === null ? 'Prazo não informado' : dias < 0 ? `Vencido há ${-dias} dias` : dias === 0 ? 'Vence hoje' : `${dias} dias restantes`;
  return <ScrollView style={common.page} contentContainerStyle={common.content}>
    <ScreenHeading title={lote.produto_nome} subtitle={lote.nome_lote} />
    <View style={common.card}>
      <View style={common.row}><Text style={common.muted}>Situação</Text><NivelVencimentoBadge nivel={lote.nivel_vencimento} /></View>
      <Text style={{ color: colors.greenDark, fontSize: 28, fontWeight: '800', marginTop: 16 }}>{formatarData(validadeDoLote(lote))}</Text>
      <Text style={[common.body, { color: colors.muted, marginTop: 4 }]}>{prazo}</Text>
    </View>
    <View style={common.card}>
      <Text style={[common.heading, { marginBottom: 4 }]}>Estoque e custo</Text>
      <DetailRow label="Quantidade disponível" value={`${lote.quantidade} unidades`} />
      <DetailRow label="Custo por unidade" value={formatarMoeda(lote.custo_unitario_compra)} />
      <DetailRow label="Situação do estoque" value={lote.esgotado ? 'Esgotado' : 'Disponível'} />
    </View>
    <View style={common.card}>
      <Text style={[common.heading, { marginBottom: 4 }]}>Registro</Text>
      <DetailRow label="Código do lote" value={lote.nome_lote} />
      <DetailRow label="Data de cadastro" value={formatarData(lote.data_cadastro)} />
    </View>
  </ScrollView>;
}
