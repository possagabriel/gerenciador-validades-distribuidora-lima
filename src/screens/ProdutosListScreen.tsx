import { useEffect, useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProdutos } from '../hooks/useProdutos';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import type { ProductsStackParams } from '../navigation/types';
import ProdutoCard from '../components/ProdutoCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import ScreenHeading from '../components/ScreenHeading';
import RefreshNotice from '../components/RefreshNotice';
import { colors, common, spacing } from '../components/theme';

export default function ProdutosListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useProdutos(appliedSearch);
  useRefreshOnFocus('produtos', appliedSearch);
  const all = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.count ?? 0;
  return <View style={common.page}>
    <ScreenHeading title="Produtos" subtitle={`${total} ${total === 1 ? 'produto' : 'produtos'} no catálogo`} />
    <View style={{ marginBottom: 16 }}>
      <TextInput accessibilityLabel="Buscar produto" value={search} onChangeText={setSearch}
        placeholder="Buscar por nome ou código" placeholderTextColor={colors.muted} returnKeyType="search" style={[common.input, { paddingLeft: 43 }]} />
      <Ionicons name="search-outline" size={22} color={colors.muted} style={{ position: 'absolute', left: 14, top: 13 }} />
    </View>
    {query.data && query.isError ? <RefreshNotice onRetry={() => void query.refetch()} /> : null}
    {query.isLoading ? <LoadingState /> : query.isError && !query.data ? <ErrorState onRetry={() => void query.refetch()} /> :
      <FlatList data={all} keyExtractor={item => String(item.id)} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
        contentContainerStyle={[common.content, !all.length && { flexGrow: 1 }]}
        renderItem={({ item }) => <ProdutoCard produto={item} onPress={() => navigation.navigate('ProdutoDetalhe', { id: item.id })} />}
        ListEmptyComponent={<EmptyState icon="cube-outline" title={search ? 'Nenhum produto encontrado' : 'Seu catálogo está vazio'}
          description={search ? 'Tente outro nome ou código de barras.' : 'Cadastre o primeiro produto para começar a organizar o estoque.'}
          actionLabel={search ? undefined : 'Adicionar produto'} onAction={search ? undefined : () => navigation.navigate('AdicionarProduto')} />}
        ListFooterComponent={query.hasNextPage ? <ActionButton label={query.isFetchingNextPage ? 'Carregando mais…' : 'Carregar mais produtos'}
          loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} style={{ marginBottom: spacing.md }} /> : null} />}
    <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.md }}>
      <ActionButton label="Adicionar produto" icon="add-outline" onPress={() => navigation.navigate('AdicionarProduto')} />
    </View>
  </View>;
}
