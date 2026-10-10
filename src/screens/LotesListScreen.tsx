import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLotes } from '../hooks/useLotes';
import { podeEditarEstoque, usePerfil } from '../hooks/usePerfil';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import type { NivelVencimento } from '../types/lote';
import type { ProductsStackParams } from '../navigation/types';
import LoteCard from '../components/LoteCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ActionButton from '../components/ActionButton';
import ScreenHeading from '../components/ScreenHeading';
import RefreshNotice from '../components/RefreshNotice';
import { colors, common, radius, spacing } from '../components/theme';

const PAGE_SIZE = 20;
const filters: { label: string; value: NivelVencimento | undefined }[] = [
  { label: 'Todos', value: undefined }, { label: 'Em dia', value: 0 },
  { label: 'Atenção', value: 1 }, { label: 'Crítico', value: 2 }, { label: 'Vencido', value: 3 }
];

export default function LotesListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const route = useRoute();
  const produtoId = route.name === 'SkuLotes' ? (route.params as { produtoId: number; codigo?: string }).produtoId : undefined;
  const codigo = route.name === 'SkuLotes' ? (route.params as { produtoId: number; codigo?: string }).codigo : undefined;
  const [nivel, setNivel] = useState<NivelVencimento | undefined>();
  const [esgotado, setEsgotado] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const query = useLotes(nivel, page, produtoId, esgotado);
  const perfil = usePerfil();
  useRefreshOnFocus('lotes', [nivel ?? 'todos', page, produtoId ?? 'todos', esgotado ?? 'todos']);
  const visible = query.data?.items ?? [];
  const total = query.data?.count ?? 0;
  return <View style={common.page}>
    <ScreenHeading title={produtoId ? 'Lotes do produto' : 'Lotes'}
      subtitle={`${total} ${total === 1 ? 'lote' : 'lotes'} nesta lista`} />
    {codigo ? <View style={[common.card, { backgroundColor: colors.greenSoft, borderColor: colors.greenSoft, paddingVertical: 12 }]}>
      <Text style={[common.muted, { color: colors.greenDark }]}>Código {codigo} · os lotes pertencem ao produto.</Text>
    </View> : null}
    {podeEditarEstoque(perfil.data?.tipo_funcionario) ? <View style={{ marginBottom: spacing.md }}>
      <ActionButton label="Adicionar lote" onPress={() => navigation.navigate('LoteFormulario', { produtoId })} />
    </View> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}
      contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
      {filters.map(filter => <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: nivel === filter.value }}
        onPress={() => { setNivel(filter.value); setPage(1); }}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.base, borderRadius: radius.pill, borderWidth: 1, opacity: pressed ? 0.7 : 1,
          borderColor: nivel === filter.value ? colors.green : colors.border,
          backgroundColor: nivel === filter.value ? colors.green : colors.white })}>
        <Text style={{ color: nivel === filter.value ? colors.white : colors.muted, fontWeight: '700' }}>{filter.label}</Text>
      </Pressable>)}
    </ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
      {([['Todos', undefined], ['Disponíveis', false], ['Esgotados', true]] as const).map(([label, valor]) => <Pressable key={label}
        accessibilityRole="button" accessibilityState={{ selected: esgotado === valor }} onPress={() => { setEsgotado(valor); setPage(1); }}
        style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.base, borderRadius: radius.pill, borderWidth: 1,
          borderColor: esgotado === valor ? colors.green : colors.border }}>
        <Text style={{ color: colors.greenDark }}>{label}</Text>
      </Pressable>)}
    </ScrollView>
    {query.data && query.isError ? <RefreshNotice onRetry={() => void query.refetch()} /> : null}
    {query.isLoading ? <LoadingState /> : query.isError && !query.data ? <ErrorState onRetry={() => void query.refetch()} /> :
      <FlatList data={visible} keyExtractor={item => String(item.id)}
        refreshing={query.isRefetching} onRefresh={() => void query.refetch()} contentContainerStyle={common.content}
        renderItem={({ item }) => <LoteCard lote={item} onPress={() => navigation.navigate('LoteDetalhe', { id: item.id })} />}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="Nenhum lote nesta lista"
          description="Tente outro filtro para conferir as validades." />}
        ListFooterComponent={<Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />} />}
  </View>;
}
