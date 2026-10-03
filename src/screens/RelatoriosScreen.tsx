import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { obterRelatorio } from '../api/relatorios';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import RefreshNotice from '../components/RefreshNotice';
import { colors, common, radius, spacing } from '../components/theme';
import { formatarData, formatarMoeda } from '../utils/formatters';

export default function RelatoriosScreen(): React.JSX.Element {
  const query = useQuery({ queryKey: ['relatorio'], queryFn: obterRelatorio });
  useRefreshOnFocus('relatorio');
  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  return <FlatList style={common.page} contentContainerStyle={common.content}
    data={data.lotes_considerados} keyExtractor={lote => String(lote.id)}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.green} />}
    ListHeaderComponent={<>
      <ScreenHeading title="Prejuízo" subtitle={`${formatarData(data.periodo.data_inicio)} a ${formatarData(data.periodo.data_fim)}`} />
      {query.isError ? <RefreshNotice onRetry={() => void query.refetch()} /> : null}
      <View style={[common.card, { borderRadius: radius.feature, padding: spacing.xl }]}>
        <Text style={common.muted}>Prejuízo total</Text>
        <Text style={{ color: colors.ink, fontSize: 30, fontWeight: '800', marginTop: 8 }}>{formatarMoeda(data.prejuizo_total)}</Text>
        <Text style={[common.muted, { marginTop: 7 }]}>No período exibido acima</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        <View style={[common.card, { flex: 1, marginBottom: 0 }]}>
          <Text style={common.eyebrow}>LOTES</Text>
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 5 }}>{data.quantidade_lotes_considerados}</Text>
          <Text style={common.muted}>considerados</Text>
        </View>
        <View style={[common.card, { flex: 1, marginBottom: 0 }]}>
          <Text style={common.eyebrow}>SEM CUSTO</Text>
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 5 }}>{data.quantidade_lotes_sem_custo_cadastrado}</Text>
          <Text style={common.muted}>sem valor cadastrado</Text>
        </View>
      </View>
      <Text style={[common.heading, { marginBottom: 12 }]}>Lotes considerados</Text>
    </>}
    renderItem={({ item: lote }) => <View style={common.card}>
      <Text style={common.heading}>{lote.produto_nome}</Text>
      <Text style={[common.muted, { marginTop: 5 }]}>{lote.nome_lote}</Text>
      <View style={[common.row, { marginTop: 14 }]}>
        <Text style={common.body}>{lote.quantidade} unidades</Text>
        <Text style={[common.body, { fontWeight: '700' }]}>{formatarData(lote.data_validade)}</Text>
      </View>
    </View>}
    ListEmptyComponent={<EmptyState icon="document-text-outline" title="Sem lotes no período" description="O relatório ainda não tem lotes com custo e prejuízo calculável." />}
  />;
}
