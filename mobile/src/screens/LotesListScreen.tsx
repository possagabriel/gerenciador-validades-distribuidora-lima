import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useLotes } from '../hooks/useLotes';
import type { NivelVencimento } from '../types/lote';
import type { ProductsStackParams } from '../navigation/types';
import LoteCard from '../components/LoteCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { common } from '../components/theme';
import { pageItems } from '../api/pagination';

const filters: { label: string; value: NivelVencimento | undefined }[] = [
  { label: 'Todos', value: undefined }, { label: 'Atenção', value: 1 }, { label: 'Crítico', value: 2 }, { label: 'Vencido', value: 3 }
];

export default function LotesListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const route = useRoute();
  const produtoId = route.name === 'SkuLotes' ? (route.params as { produtoId: number; codigo: string }).produtoId : undefined;
  const codigo = route.name === 'SkuLotes' ? (route.params as { produtoId: number; codigo: string }).codigo : undefined;
  const [nivel, setNivel] = useState<NivelVencimento | undefined>();
  const [page, setPage] = useState(1);
  const query = useLotes(nivel);
  const queryClient = useQueryClient();
  useFocusEffect(useCallback(() => { void queryClient.invalidateQueries({ queryKey: ['lotes'], refetchType: 'active' }); }, [queryClient]));
  const all = (query.data ?? []).filter(item => produtoId === undefined || item.produto === produtoId);
  return <View style={common.page}>
    {codigo && <Text style={[common.muted, { marginBottom: 12 }]}>Código {codigo}: a API vincula lotes ao produto, não ao SKU.</Text>}
    <View style={[common.row, { marginBottom: 12 }]}>{filters.map(filter =>
      <Pressable key={filter.label} onPress={() => { setNivel(filter.value); setPage(1); }} style={{ padding: 8, borderRadius: 8, backgroundColor: nivel === filter.value ? '#CDE8DF' : '#FFF' }}>
        <Text style={{ fontSize: 12 }}>{filter.label}</Text>
      </Pressable>)}</View>
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> :
      <FlatList data={pageItems(all, page, 20)} keyExtractor={item => String(item.id)} renderItem={({ item }) =>
        <LoteCard lote={item} onPress={() => navigation.navigate('LoteDetalhe', { id: item.id })} />}
        ListEmptyComponent={<Text style={common.muted}>Nenhum lote encontrado.</Text>}
        ListFooterComponent={<View style={[common.row, { paddingVertical: 12 }]}>
          <Pressable disabled={page === 1} onPress={() => setPage(page - 1)}><Text>Anterior</Text></Pressable>
          <Text>Página {page} de {Math.max(1, Math.ceil(all.length / 20))}</Text>
          <Pressable disabled={page * 20 >= all.length} onPress={() => setPage(page + 1)}><Text>Próxima</Text></Pressable>
        </View>} />}
  </View>;
}
