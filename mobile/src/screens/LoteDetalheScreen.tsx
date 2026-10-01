import { ScrollView, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useLote } from '../hooks/useLotes';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import NivelVencimentoBadge from '../components/NivelVencimentoBadge';
import { common } from '../components/theme';
import { diasRestantes, formatarData, formatarMoeda, validadeDoLote } from '../utils/formatters';

export default function LoteDetalheScreen(): React.JSX.Element {
  const route = useRoute();
  const id = (route.params as { id: number }).id;
  const query = useLote(id);
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const lote = query.data;
  return <ScrollView style={common.page}><View style={common.card}>
    <Text style={common.title}>{lote.produto_nome}</Text><NivelVencimentoBadge nivel={lote.nivel_vencimento} />
    <Text style={common.body}>Lote: {lote.nome_lote}</Text>
    <Text style={common.body}>Validade: {formatarData(validadeDoLote(lote))}</Text>
    <Text style={common.body}>Dias restantes: {diasRestantes(lote) ?? 'Não informado'}</Text>
    <Text style={common.body}>Quantidade: {lote.quantidade}</Text>
    <Text style={common.body}>Custo unitário: {formatarMoeda(lote.custo_unitario_compra)}</Text>
    <Text style={common.body}>Cadastro: {formatarData(lote.data_cadastro)}</Text>
    <Text style={common.body}>Esgotado: {lote.esgotado ? 'Sim' : 'Não'}</Text>
  </View></ScrollView>;
}
