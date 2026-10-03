import { FlatList, RefreshControl, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { obterDescontos } from '../api/relatorios';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import RefreshNotice from '../components/RefreshNotice';
import { colors, common, radius } from '../components/theme';
import { formatarMoeda } from '../utils/formatters';

export default function DescontosScreen(): React.JSX.Element {
  const query = useQuery({ queryKey: ['descontos'], queryFn: obterDescontos });
  useRefreshOnFocus('descontos');
  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  return <FlatList style={common.page} contentContainerStyle={common.content}
    data={query.data.sugestoes} keyExtractor={item => String(item.lote_id)}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.green} />}
    ListHeaderComponent={<>
      <ScreenHeading title="Descontos" subtitle={`${query.data.quantidade} ${query.data.quantidade === 1 ? 'sugestão' : 'sugestões'} para lotes em estoque`} />
      {query.isError ? <RefreshNotice onRetry={() => void query.refetch()} /> : null}
    </>}
    renderItem={({ item }) => <View style={common.card}>
      <View style={[common.row, { alignItems: 'flex-start', gap: 10 }]}>
        <Text style={[common.heading, { flex: 1 }]}>{item.produto}</Text>
        <View style={{ backgroundColor: colors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: colors.greenDark, fontWeight: '800' }}>−{item.percentual_desconto}%</Text>
        </View>
      </View>
      <Text style={[common.muted, { marginTop: 4 }]}>{item.categoria} · {item.nome_lote}</Text>
      <View style={[common.row, { marginTop: 18, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border }]}>
        <View><Text style={common.eyebrow}>DE</Text><Text style={[common.body, { color: colors.muted, textDecorationLine: 'line-through' }]}>{formatarMoeda(item.preco_venda)}</Text></View>
        <Ionicons name="arrow-forward" size={20} color={colors.muted} />
        <View style={{ alignItems: 'flex-end' }}><Text style={common.eyebrow}>POR</Text><Text style={{ color: colors.greenDark, fontSize: 21, fontWeight: '800' }}>{formatarMoeda(item.preco_sugerido)}</Text></View>
      </View>
      <Text style={[common.muted, { marginTop: 11 }]}>{item.quantidade} unidades disponíveis</Text>
      {item.abaixo_do_custo ? <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.input, padding: 10, marginTop: 12 }}>
        <Text style={{ color: colors.danger, fontWeight: '700' }}>Atenção: preço abaixo do custo</Text>
      </View> : null}
    </View>}
    ListEmptyComponent={<EmptyState icon="pricetag-outline" title="Nenhuma sugestão agora" description="Quando houver lotes próximos do vencimento, as sugestões aparecerão aqui." />}
  />;
}
