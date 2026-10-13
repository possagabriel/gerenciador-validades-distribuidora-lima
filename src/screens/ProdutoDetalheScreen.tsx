import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { criarCodigoBarras, excluirProduto } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import { useProduto } from '../hooks/useProdutos';
import { podeEditarEstoque, podeGerenciar, usePerfil } from '../hooks/usePerfil';
import { useKeyboardScroll } from '../hooks/useKeyboardScroll';
import type { Produto } from '../types/produto';
import type { ProductsStackParams } from '../navigation/types';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import RefreshNotice from '../components/RefreshNotice';
import { colors, common, radius, spacing, type } from '../components/theme';
import { formatarMoeda } from '../utils/formatters';

export default function ProdutoDetalheScreen(): React.JSX.Element {
  const { params } = useRoute<RouteProp<ProductsStackParams, 'ProdutoDetalhe'>>();
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const queryClient = useQueryClient();
  const { scrollRef, onInputFocus } = useKeyboardScroll();
  const query = useProduto(params.id);
  const perfil = usePerfil();
  const [adicionando, setAdicionando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const confirmarExclusao = () => Alert.alert(
    'Excluir produto?',
    'O produto e seus lotes sairão do catálogo. Os registros ficarão preservados para recuperação.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { void apagarProduto(); } }
    ]
  );

  const apagarProduto = async () => {
    if (excluindo) return;
    setExcluindo(true); setErroExclusao('');
    try {
      await excluirProduto(params.id);
      navigation.popToTop();
      queryClient.removeQueries({ queryKey: ['produto', params.id] });
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      void queryClient.invalidateQueries({ queryKey: ['prioridade'] });
      void queryClient.invalidateQueries({ queryKey: ['alertas'] });
      void queryClient.invalidateQueries({ queryKey: ['relatorio'] });
      void queryClient.invalidateQueries({ queryKey: ['descontos'] });
      void queryClient.invalidateQueries({ queryKey: ['produto-codigo'] });
    } catch (error) { setErroExclusao(mensagemErro(error, 'Não foi possível excluir o produto.')); }
    finally { setExcluindo(false); }
  };

  const salvarCodigo = async () => {
    const valor = codigo.trim();
    if (!valor) { setErro('Informe o código de barras.'); return; }
    setSalvando(true); setErro('');
    try {
      const sku = await criarCodigoBarras(params.id, valor);
      queryClient.setQueryData<Produto>(['produto', params.id], current =>
        current ? { ...current, skus: [...current.skus, sku] } : current);
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setCodigo(''); setAdicionando(false);
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível adicionar o código.')); }
    finally { setSalvando(false); }
  };

  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const produto = query.data;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} style={common.page} contentContainerStyle={common.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <ScreenHeading title={produto.nome} subtitle={produto.categoria_nome} />
    {query.isError ? <RefreshNotice onRetry={() => void query.refetch()} /> : null}
    <View style={[common.card, { borderRadius: radius.feature, padding: spacing.xl }]}>
      <Text style={common.muted}>Preço de venda</Text>
      <Text style={{ color: colors.ink, fontSize: 30, fontWeight: '800', marginTop: 5 }}>{formatarMoeda(produto.preco_venda)}</Text>
      <Text style={[common.muted, { marginTop: 8 }]}>{produto.skus.length} {produto.skus.length === 1 ? 'código de barras' : 'códigos de barras'} cadastrados</Text>
    </View>
    {podeEditarEstoque(perfil.data?.tipo_funcionario) ? <ActionButton label="Editar produto" icon="create-outline" variant="secondary"
      onPress={() => navigation.navigate('EditarProduto', { id: produto.id })} style={{ marginBottom: spacing.sm }} />
      : null}
    {podeGerenciar(perfil.data?.tipo_funcionario) ? <ActionButton label="Excluir produto" icon="trash-outline" variant="danger"
      onPress={confirmarExclusao} loading={excluindo} style={{ marginBottom: spacing.sm }} /> : null}
    {erroExclusao ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: spacing.md }}>{erroExclusao}</Text> : null}
    <ActionButton label="Ver lotes deste produto" onPress={() => navigation.navigate('SkuLotes', { produtoId: produto.id })}
      variant="secondary" style={{ marginBottom: 25 }} />
    {podeEditarEstoque(perfil.data?.tipo_funcionario) ? <ActionButton label="Adicionar lote" variant="secondary"
      onPress={() => navigation.navigate('LoteFormulario', { produtoId: produto.id })} style={{ marginBottom: spacing.md }} /> : null}
    <View style={[common.row, { marginBottom: 12 }]}>
      <Text style={common.heading}>Códigos de barras</Text>
      {podeEditarEstoque(perfil.data?.tipo_funcionario) ? <Pressable accessibilityRole="button" onPress={() => { setAdicionando(value => !value); setErro(''); }} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: colors.greenDark, fontWeight: '700' }}>{adicionando ? 'Cancelar' : 'Adicionar'}</Text>
      </Pressable> : null}
    </View>
    {adicionando ? <View style={common.card}>
      <TextInput accessibilityLabel="Novo código de barras" value={codigo} onChangeText={setCodigo}
        onFocus={onInputFocus} placeholder="Digite o código" autoCapitalize="none" autoCorrect={false} maxLength={50} style={[common.input, { marginBottom: 10 }]} />
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
    </ScrollView>
  </KeyboardAvoidingView>;
}
