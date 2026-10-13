import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { atualizarLote, criarLote, detalharLote } from '../api/lotes';
import { listarProdutos } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import { dateToISO } from '../utils/calendar';
import { lerPreco } from '../utils/formatters';
import { useKeyboardScroll } from '../hooks/useKeyboardScroll';
import ActionButton from '../components/ActionButton';
import DatePickerField from '../components/DatePickerField';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, radius, spacing } from '../components/theme';

export default function LoteFormularioScreen(): React.JSX.Element {
  const route = useRoute();
  const params = (route.params ?? {}) as { id?: number; produtoId?: number };
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { scrollRef, onInputFocus } = useKeyboardScroll();
  const [buscaProduto, setBuscaProduto] = useState('');
  const lote = useQuery({ queryKey: ['lote', params.id], queryFn: () => detalharLote(params.id!), enabled: Boolean(params.id) });
  const produtos = useQuery({ queryKey: ['produtos-opcoes', buscaProduto], queryFn: () => listarProdutos(buscaProduto), enabled: !params.id && !params.produtoId });
  const [produtoId, setProdutoId] = useState<number | null>(params.produtoId ?? null);
  const [quantidade, setQuantidade] = useState('');
  const [custo, setCusto] = useState('');
  const [validade, setValidade] = useState('');
  const [validadeInicial, setValidadeInicial] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!lote.data) return;
    setProdutoId(lote.data.produto);
    setCusto(String(lote.data.custo_unitario_compra ?? '').replace('.', ','));
    const data = lote.data.data_validade?.slice(0, 10) ?? '';
    setValidade(data);
    setValidadeInicial(data);
  }, [lote.data]);

  const salvar = async () => {
    const custoNumero = lerPreco(custo);
    const numero = Number(quantidade);
    const errosNovos: Record<string, string> = {};
    if (!produtoId) errosNovos.produto = 'Selecione um produto.';
    if (!params.id && (!Number.isInteger(numero) || numero < 1 || numero > 999999999)) errosNovos.quantidade = 'Informe entre 1 e 999999999 unidades.';
    if (custoNumero === null) errosNovos.custo = 'Informe um custo válido.';
    if (!validade || (validade !== validadeInicial && validade < dateToISO(new Date()))) errosNovos.validade = 'Selecione uma validade de hoje em diante.';
    if (Object.keys(errosNovos).length) { setErros(errosNovos); scrollRef.current?.scrollTo({ y: 0, animated: true }); return; }
    setErros({}); setSalvando(true);
    try {
      if (params.id) {
        const alteracao = { custo_unitario_compra: custoNumero! } as { custo_unitario_compra: number; data_validade?: string };
        if (validade !== validadeInicial) alteracao.data_validade = `${validade}T12:00:00.000Z`;
        const atualizado = await atualizarLote(params.id, alteracao);
        queryClient.setQueryData(['lote', params.id], atualizado);
      } else {
        await criarLote({ produto: produtoId!, quantidade: numero, custo_unitario_compra: custoNumero!, data_validade: `${validade}T12:00:00.000Z` });
      }
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      void queryClient.invalidateQueries({ queryKey: ['prioridade'] });
      void queryClient.invalidateQueries({ queryKey: ['alertas'] });
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      navigation.goBack();
    } catch (error) { setErros({ geral: mensagemErro(error, 'Não foi possível salvar o lote.') }); }
    finally { setSalvando(false); }
  };

  if (params.id && lote.isLoading) return <LoadingState />;
  if (params.id && !lote.data) return <ErrorState onRetry={() => void lote.refetch()} />;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} style={common.page} contentContainerStyle={common.content} keyboardShouldPersistTaps="handled">
      <ScreenHeading title={params.id ? 'Editar lote' : 'Novo lote'} subtitle="Validade, quantidade e custo por unidade." />
      <View style={common.card}>
        <Text style={[common.muted, { marginBottom: 8 }]}>Produto *</Text>
        {params.id || params.produtoId ? <Text style={[common.body, { marginBottom: spacing.md }]}>{lote.data?.produto_nome ?? 'Produto selecionado'}</Text> :
          <View style={{ marginBottom: spacing.md }}>
            <TextInput accessibilityLabel="Buscar produto para o lote" placeholder="Buscar produto" value={buscaProduto} onChangeText={setBuscaProduto}
              onFocus={onInputFocus} style={common.input} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {(produtos.data ?? []).map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: produtoId === item.id }}
              onPress={() => setProdutoId(item.id)} style={{ borderRadius: radius.pill, borderWidth: 1, borderColor: produtoId === item.id ? colors.green : colors.border, padding: 10 }}>
              <Text style={{ color: colors.greenDark }}>{item.nome}</Text>
            </Pressable>)}
            </View>
          </View>}
        {erros.produto ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{erros.produto}</Text> : null}
        <Text style={common.muted}>Validade *</Text>
        <DatePickerField label="Data de validade" value={validade} minDate={dateToISO(new Date())} onChangeText={setValidade} />
        {erros.validade ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{erros.validade}</Text> : null}
        {!params.id ? <>
          <Text style={[common.muted, { marginTop: spacing.md }]}>Quantidade inicial *</Text>
          <TextInput accessibilityLabel="Quantidade inicial" value={quantidade} onChangeText={value => setQuantidade(value.replace(/\D/g, ''))}
            onFocus={onInputFocus} keyboardType="number-pad" maxLength={9} style={common.input} />
          {erros.quantidade ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{erros.quantidade}</Text> : null}
        </> : <Text style={[common.muted, { marginVertical: spacing.md }]}>Para corrigir a quantidade, use a movimentação no detalhe do lote.</Text>}
        <Text style={[common.muted, { marginTop: spacing.md }]}>Custo por unidade *</Text>
        <TextInput accessibilityLabel="Custo por unidade" value={custo} onChangeText={setCusto} onFocus={onInputFocus}
          keyboardType="decimal-pad" style={common.input} />
        {erros.custo ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{erros.custo}</Text> : null}
      </View>
      {erros.geral ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: spacing.md }}>{erros.geral}</Text> : null}
      <ActionButton label="Salvar lote" onPress={() => void salvar()} loading={salvando} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
