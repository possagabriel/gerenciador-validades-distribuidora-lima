import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useProdutos } from '../hooks/useProdutos';
import type { ProductsStackParams } from '../navigation/types';
import { pageItems } from '../api/pagination';
import ProdutoCard from '../components/ProdutoCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { common } from '../components/theme';

const PAGE_SIZE = 20;
export default function ProdutosListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useProdutos(search.trim());
  useFocusEffect(useCallback(() => { void queryClient.invalidateQueries({ queryKey: ['produtos'], refetchType: 'active' }); }, [queryClient]));
  const all = query.data ?? [];
  const visible = pageItems(all, page, PAGE_SIZE);
  return <View style={common.page}>
    <TextInput accessibilityLabel="Buscar produto" value={search} onChangeText={value => { setSearch(value); setPage(1); }} placeholder="Nome ou código de barras" style={common.input} />
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> :
      <FlatList data={visible} keyExtractor={item => String(item.id)} renderItem={({ item }) =>
        <ProdutoCard produto={item} onPress={() => navigation.navigate('ProdutoDetalhe', { id: item.id })} />}
        ListEmptyComponent={<Text style={common.muted}>Nenhum produto encontrado.</Text>}
        ListFooterComponent={<View style={[common.row, { paddingVertical: 12 }]}>
          <Pressable accessibilityRole="button" disabled={page === 1} onPress={() => setPage(page - 1)}><Text style={{ color: page === 1 ? '#999' : '#156053' }}>Anterior</Text></Pressable>
          <Text>Página {page} de {Math.max(1, Math.ceil(all.length / PAGE_SIZE))}</Text>
          <Pressable accessibilityRole="button" disabled={page * PAGE_SIZE >= all.length} onPress={() => setPage(page + 1)}><Text style={{ color: page * PAGE_SIZE >= all.length ? '#999' : '#156053' }}>Próxima</Text></Pressable>
        </View>} />}
    <Pressable accessibilityRole="button" accessibilityLabel="Ler código de barras" onPress={() => navigation.navigate('Scanner')} style={[common.button, { position: 'absolute', right: 20, bottom: 20, borderRadius: 30, paddingHorizontal: 20 }]}>
      <Text style={common.buttonText}>Ler código</Text>
    </Pressable>
  </View>;
}
