import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { obterDescontos, obterRegrasDesconto } from '../api/relatorios';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import RefreshNotice from '../components/RefreshNotice';
import { colors, common, radius } from '../components/theme';
import { formatarMoeda } from '../utils/formatters';

export default function DescontosScreen(): React.JSX.Element {
  const [categoria, setCategoria] = useState('Todas');
  const query = useQuery({ queryKey: ['descontos'], queryFn: obterDescontos });
  const regras = useQuery({ queryKey: ['regras-desconto'], queryFn: obterRegrasDesconto, enabled: query.data?.quantidade === 0 });
  useRefreshOnFocus('descontos');
  useRefreshOnFocus('regras-desconto');
  const categorias = useMemo(() => ['Todas', ...new Set(query.data?.sugestoes.map(item => item.categoria) ?? [])], [query.data]);
  const sugestoes = useMemo(() => query.data?.sugestoes.filter(item => categoria === 'Todas' || item.categoria === categoria) ?? [], [query.data, categoria]);
  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  return <FlatList style={common.page} contentContainerStyle={common.content}
    data={sugestoes} keyExtractor={item => String(item.lote_id)}
    refreshControl={<RefreshControl refreshing={query.isRefetching || regras.isRefetching}
      onRefresh={() => { void query.refetch(); if (query.data?.quantidade === 0) void regras.refetch(); }} tintColor={colors.green} />}
    ListHeaderComponent={<>
      <ScreenHeading title="Descontos" subtitle={`${query.data.quantidade} ${query.data.quantidade === 1 ? 'sugestão' : 'sugestões'} para lotes em estoque`} />
      {query.isError ? <RefreshNotice onRetry={() => void query.refetch()} /> : null}
      {categorias.length > 1 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {categorias.map(nome => <Pressable key={nome} accessibilityRole="button" accessibilityState={{ selected: categoria === nome }}
          onPress={() => setCategoria(nome)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.pill,
            backgroundColor: categoria === nome ? colors.greenDark : colors.white, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: categoria === nome ? colors.white : colors.greenDark, fontWeight: '700' }}>{nome}</Text>
        </Pressable>)}
      </View> : null}
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
        <Text style={{ color: colors.danger, fontWeight: '700' }}>Atenção: preço abaixo do custo. Revise antes de aplicar.</Text>
      </View> : null}
    </View>}
    ListEmptyComponent={<EmptyState icon="pricetag-outline"
      title={categoria !== 'Todas' ? 'Nenhuma sugestão nesta categoria' : regras.data?.length === 0 ? 'Sem regras de desconto' : 'Nenhuma sugestão agora'}
      description={categoria !== 'Todas' ? 'Selecione outra categoria ou veja todas as sugestões.' :
        regras.data?.length === 0 ? 'As sugestões dependem de regras de desconto configuradas pela gerência no sistema web.' :
          'Nenhum lote em estoque entrou no prazo das regras de desconto configuradas.'} />}
    ListFooterComponent={sugestoes.length ? <Text style={[common.muted, { textAlign: 'center', marginTop: 6 }]}>Os preços acima são sugestões e não alteram o cadastro dos produtos.</Text> : null}
  />;
}
