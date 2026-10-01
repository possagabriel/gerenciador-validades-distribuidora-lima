import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProduto } from '../hooks/useProdutos';
import type { ProductsStackParams } from '../navigation/types';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { common } from '../components/theme';
import { formatarMoeda } from '../utils/formatters';

export default function ProdutoDetalheScreen(): React.JSX.Element {
  const { params } = useRoute<RouteProp<ProductsStackParams, 'ProdutoDetalhe'>>();
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const query = useProduto(params.id);
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const produto = query.data;
  return <ScrollView style={common.page}>
    <View style={common.card}><Text style={common.title}>{produto.nome}</Text>
      <Text style={common.body}>Categoria: {produto.categoria_nome}</Text>
      <Text style={common.body}>Preço: {formatarMoeda(produto.preco_venda)}</Text></View>
    <Text style={common.heading}>Códigos de barras</Text>
    {produto.skus.map(sku => <Pressable key={sku.id} accessibilityRole="button" onPress={() => navigation.navigate('SkuLotes', { produtoId: produto.id, codigo: sku.codigo_barras })} style={common.card}>
      <Text style={common.body}>{sku.codigo_barras}</Text><Text style={common.muted}>Ver lotes deste produto ›</Text>
    </Pressable>)}
    {!produto.skus.length && <Text style={common.muted}>Nenhum código cadastrado.</Text>}
  </ScrollView>;
}
