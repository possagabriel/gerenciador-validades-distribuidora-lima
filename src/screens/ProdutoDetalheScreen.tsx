import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { criarCodigoBarras } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import { useProduto } from '../hooks/useProdutos';
import type { Produto } from '../types/produto';
import type { ProductsStackParams } from '../navigation/types';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import RefreshNotice from '../components/RefreshNotice';
import BarcodeField from '../components/BarcodeField';
import { colors, common, radius, spacing, type } from '../components/theme';
import { formatarMoeda } from '../utils/formatters';

export default function ProdutoDetalheScreen(): React.JSX.Element {
  const { params } = useRoute<RouteProp<ProductsStackParams, 'ProdutoDetalhe'>>();
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const queryClient = useQueryClient();
  const query = useProduto(params.id);
  const [adicionando, setAdicionando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [erro, setErro] = useState('');

  const salvarCodigo = async () => {
    if (salvandoRef.current) return;
    const valor = codigo.trim();
    if (!valor) { setErro('Informe o código de barras.'); return; }
    salvandoRef.current = true;
    setSalvando(true); setErro('');
    try {
      const sku = await criarCodigoBarras(params.id, valor);
      queryClient.setQueryData<Produto>(['produto', params.id], current =>
        current ? { ...current, skus: [...current.skus.filter(item => item.id !== sku.id), sku] } : current);
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setCodigo(''); setAdicionando(false);
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível adicionar o código.')); }
    finally { salvandoRef.current = false; setSalvando(false); }
  };

  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const produto = query.data;
  return <ScrollView style={common.page} contentContainerStyle={common.content}>
    <ScreenHeading title={produto.nome} subtitle={produto.categoria_nome} />
    {query.isError ? <RefreshNotice onRetry={() => void query.refetch()} /> : null}
    <View style={[common.card, { borderRadius: radius.feature, padding: spacing.xl }]}>
      <Text style={common.muted}>Preço de venda</Text>
      <Text style={{ color: colors.ink, fontSize: 30, fontWeight: '800', marginTop: 5 }}>{formatarMoeda(produto.preco_venda)}</Text>
      <Text style={[common.muted, { marginTop: 8 }]}>{produto.skus.length} {produto.skus.length === 1 ? 'código de barras' : 'códigos de barras'} cadastrados</Text>
    </View>
    <ActionButton label="Ver lotes deste produto" onPress={() => navigation.navigate('SkuLotes', { produtoId: produto.id })}
      variant="secondary" style={{ marginBottom: 25 }} />
    <View style={[common.row, { marginBottom: 12 }]}>
      <Text style={common.heading}>Códigos de barras</Text>
      <Pressable accessibilityRole="button" onPress={() => { setAdicionando(value => !value); setErro(''); }} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: colors.greenDark, fontWeight: '700' }}>{adicionando ? 'Cancelar' : 'Adicionar'}</Text>
      </Pressable>
    </View>
    {adicionando ? <View style={common.card}>
      <BarcodeField label="Novo código de barras" value={codigo} onChangeText={setCodigo} />
      {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 10 }}>{erro}</Text> : null}
      <ActionButton label="Salvar código" onPress={() => void salvarCodigo()} loading={salvando} />
    </View> : null}
    {produto.skus.length ? produto.skus.map(sku => <Pressable key={sku.id} accessibilityRole="button"
      onPress={() => navigation.navigate('SkuLotes', { produtoId: produto.id, codigo: sku.codigo_barras })} style={({ pressed }) => [common.card, { minHeight: 64, justifyContent: 'center' }, pressed && { backgroundColor: colors.greenSoft }]}>
      <View style={common.row}>
        <View style={{ flex: 1 }}>
          <Text style={[common.eyebrow, { marginBottom: 5 }]}>Código de barras</Text>
          <Text style={[common.heading, { fontSize: type.body }]}>{sku.codigo_barras}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </View>
    </Pressable>) : <EmptyState icon="barcode-outline" title="Nenhum código cadastrado" description="Adicione um código para localizar este produto pelo leitor." />}
  </ScrollView>;
}
