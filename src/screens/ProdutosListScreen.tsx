import { useEffect, useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProdutos } from '../hooks/useProdutos';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import type { ProductsStackParams } from '../navigation/types';
import { pageItems } from '../api/pagination';
import ProdutoCard from '../components/ProdutoCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, spacing } from '../components/theme';

const PAGE_SIZE = 20;
export default function ProdutosListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useProdutos(appliedSearch);
  useRefreshOnFocus('produtos', appliedSearch);
  const all = query.data ?? [];
  const visible = useMemo(() => pageItems(all, page, PAGE_SIZE), [all, page]);
  return <View style={common.page}>
    <ScreenHeading title="Produtos" subtitle={`${all.length} ${all.length === 1 ? 'produto' : 'produtos'} no catálogo`} />
    <View style={{ marginBottom: 16 }}>
      <TextInput accessibilityLabel="Buscar produto" value={search} onChangeText={value => { setSearch(value); setPage(1); }}
        placeholder="Buscar por nome ou código" placeholderTextColor={colors.muted} returnKeyType="search" style={[common.input, { paddingLeft: 43 }]} />
      <Ionicons name="search-outline" size={22} color={colors.muted} style={{ position: 'absolute', left: 14, top: 13 }} />
    </View>
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState onRetry={() => void query.refetch()} /> :
      <FlatList data={visible} keyExtractor={item => String(item.id)} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
        contentContainerStyle={[common.content, !visible.length && { flexGrow: 1 }]}
        renderItem={({ item }) => <ProdutoCard produto={item} onPress={() => navigation.navigate('ProdutoDetalhe', { id: item.id })} />}
        ListEmptyComponent={<EmptyState icon="cube-outline" title={search ? 'Nenhum produto encontrado' : 'Seu catálogo está vazio'}
          description={search ? 'Tente outro nome ou código de barras.' : 'Cadastre o primeiro produto para começar a organizar o estoque.'}
          actionLabel={search ? undefined : 'Adicionar produto'} onAction={search ? undefined : () => navigation.navigate('AdicionarProduto')} />}
        ListFooterComponent={<Pagination page={page} total={all.length} pageSize={PAGE_SIZE} onChange={setPage} />} />}
    <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.md }}>
      <ActionButton label="Adicionar produto" icon="add-outline" onPress={() => navigation.navigate('AdicionarProduto')} />
    </View>
  </View>;
}
