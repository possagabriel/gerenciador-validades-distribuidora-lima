import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { criarCategoria, criarCodigoBarras, criarProduto, listarCategorias } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import { useKeyboardScroll } from '../hooks/useKeyboardScroll';
import type { Categoria } from '../types/categoria';
import type { ProductsStackParams } from '../navigation/types';
import { erroDataParcial, erroDataValidade, lerDataBrasileira, lerPreco, mascararData } from '../utils/formatters';
import ActionButton from '../components/ActionButton';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, radius, spacing } from '../components/theme';

export default function AdicionarProdutoScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const queryClient = useQueryClient();
  const { scrollRef, onInputFocus } = useKeyboardScroll();
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: listarCategorias });
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [preco, setPreco] = useState('');
  const [validade, setValidade] = useState('');
  const [erroValidade, setErroValidade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [custo, setCusto] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvarCategoria = async () => {
    const valor = novaCategoria.trim();
    if (!valor) { setErro('Informe o nome da categoria.'); return; }
    setSalvandoCategoria(true); setErro('');
    try {
      const categoria = await criarCategoria(valor);
      setCategoriaId(categoria.id);
      setNovaCategoria('');
      setCriandoCategoria(false);
      queryClient.setQueryData<Categoria[]>(['categorias'], current => [...(current ?? []), categoria]);
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível criar a categoria.')); }
    finally { setSalvandoCategoria(false); }
  };

  const salvarProduto = async () => {
    const valorNome = nome.trim();
    const valorCodigo = codigo.trim();
    const valorPreco = lerPreco(preco);
    const valorValidade = lerDataBrasileira(validade);
    const valorQuantidade = Number(quantidade);
    const valorCusto = lerPreco(custo);
    if (!valorNome) { setErro('Informe o nome do produto.'); return; }
    if (!categoriaId) { setErro('Selecione ou crie uma categoria.'); return; }
    if (valorPreco === null) { setErro('Informe um preço válido, como 19,90.'); return; }
    if (!valorValidade) { setErroValidade(erroDataValidade(validade) ?? 'Informe uma validade válida.'); return; }
    if (!Number.isInteger(valorQuantidade) || valorQuantidade <= 0) { setErro('Informe uma quantidade maior que zero.'); return; }
    if (valorCusto === null) { setErro('Informe um custo por unidade válido, como 12,50.'); return; }
    if (valorCodigo.length > 50) { setErro('O código de barras deve ter até 50 caracteres.'); return; }
    setSalvando(true); setErro('');
    try {
      const produto = await criarProduto({
        nome: valorNome,
        categoria: categoriaId,
        preco_venda: valorPreco,
        lote_inicial: {
          quantidade: valorQuantidade,
          custo_unitario_compra: valorCusto,
          data_validade: valorValidade
        }
      });
      let produtoSalvo = produto;
      let aviso: string | null = null;
      if (valorCodigo) {
        try {
          const sku = await criarCodigoBarras(produto.id, valorCodigo);
          produtoSalvo = { ...produto, skus: [...produto.skus, sku] };
        }
        catch (error) { aviso = mensagemErro(error, 'Não foi possível salvar o código de barras.'); }
      }
      queryClient.setQueryData(['produto', produto.id], produtoSalvo);
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      navigation.replace('ProdutoDetalhe', { id: produto.id });
      if (aviso) Alert.alert('Produto criado', `O produto foi salvo, mas o código de barras não: ${aviso}`);
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível criar o produto.')); }
    finally { setSalvando(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} style={common.page} contentContainerStyle={common.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <ScreenHeading title="Novo produto" subtitle="Preencha os dados do produto." />

      <View style={common.card}>
        <Text style={[common.heading, { marginBottom: 16 }]}>Informações do produto</Text>
        <Text style={[common.muted, { marginBottom: 6 }]}>Nome do produto *</Text>
        <TextInput accessibilityLabel="Nome do produto" placeholder="Ex.: Leite integral 1L" value={nome} onChangeText={setNome}
          onFocus={onInputFocus} maxLength={255} autoCapitalize="sentences" style={[common.input, { marginBottom: 18 }]} />

        <View style={[common.row, { marginBottom: 8 }]}>
          <Text style={common.muted}>Categoria *</Text>
          <Pressable accessibilityRole="button" onPress={() => setCriandoCategoria(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.greenDark, fontWeight: '700' }}>{criandoCategoria ? 'Cancelar' : 'Nova categoria'}</Text>
          </Pressable>
        </View>
        {categorias.isError ? <ErrorState message="Não foi possível carregar as categorias." onRetry={() => void categorias.refetch()} /> :
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {(categorias.data ?? []).map(item => <Pressable key={item.id} accessibilityRole="button"
              accessibilityState={{ selected: categoriaId === item.id }} onPress={() => setCategoriaId(item.id)}
              style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, opacity: pressed ? 0.7 : 1,
                borderColor: categoriaId === item.id ? colors.green : colors.border,
                backgroundColor: categoriaId === item.id ? colors.greenSoft : colors.white })}>
              <Text style={{ color: categoriaId === item.id ? colors.greenDark : colors.muted, fontWeight: '600' }}>{item.nome}</Text>
            </Pressable>)}
            {categorias.isLoading ? <Text style={common.muted}>Carregando categorias…</Text> : null}
            {!categorias.isLoading && !categorias.data?.length ? <Text style={common.muted}>Ainda não há categorias. Crie a primeira acima.</Text> : null}
          </View>}
        {criandoCategoria ? <View style={{ backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.card, marginBottom: spacing.lg }}>
          <TextInput accessibilityLabel="Nome da nova categoria" placeholder="Ex.: Mercearia" value={novaCategoria}
            onChangeText={setNovaCategoria} onFocus={onInputFocus} maxLength={100} style={[common.input, { marginBottom: 10 }]} />
          <ActionButton label="Salvar categoria" onPress={() => void salvarCategoria()} loading={salvandoCategoria} variant="secondary" />
          <Text style={[common.muted, { marginTop: 8 }]}>Prazos iniciais: atenção em 30 dias e crítico em 7 dias.</Text>
        </View> : null}

        <Text style={[common.muted, { marginBottom: 6 }]}>Preço de venda *</Text>
        <TextInput accessibilityLabel="Preço de venda" placeholder="0,00" value={preco} onChangeText={setPreco}
          onFocus={onInputFocus} keyboardType="decimal-pad" maxLength={20} style={[common.input, { marginBottom: 6 }]} />
        <Text style={common.muted}>Valor por unidade, em reais.</Text>
      </View>

      <View style={common.card}>
        <Text style={common.heading}>Lote inicial</Text>
        <Text style={[common.muted, { marginTop: 4, marginBottom: 14 }]}>A validade define se o lote está em dia, em atenção, crítico ou vencido.</Text>

        <Text style={[common.muted, { marginBottom: 6 }]}>Data de validade * · hoje ou futura</Text>
        <TextInput accessibilityLabel="Data de validade" placeholder="DD/MM/AAAA" value={validade}
          onChangeText={value => {
            const erroParcial = erroDataParcial(value);
            if (erroParcial) { setErroValidade(erroParcial); return; }
            const formatada = mascararData(value, validade);
            setValidade(formatada);
            setErroValidade(formatada.length === 10 ? erroDataValidade(formatada) ?? '' : '');
          }} onFocus={onInputFocus} keyboardType="number-pad" maxLength={10}
          style={[common.input, { marginBottom: erroValidade ? 6 : 18 }]} />
        {erroValidade ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 18 }}>{erroValidade}</Text> : null}

        <Text style={[common.muted, { marginBottom: 6 }]}>Quantidade *</Text>
        <TextInput accessibilityLabel="Quantidade do lote" placeholder="Ex.: 24" value={quantidade}
          onChangeText={value => setQuantidade(value.replace(/\D/g, ''))} onFocus={onInputFocus} keyboardType="number-pad" maxLength={9}
          style={[common.input, { marginBottom: 18 }]} />

        <Text style={[common.muted, { marginBottom: 6 }]}>Custo por unidade *</Text>
        <TextInput accessibilityLabel="Custo por unidade" placeholder="0,00" value={custo} onChangeText={setCusto}
          onFocus={onInputFocus} keyboardType="decimal-pad" maxLength={20} style={[common.input, { marginBottom: 6 }]} />
        <Text style={common.muted}>O lote será criado automaticamente ao salvar o produto.</Text>
      </View>

      <View style={common.card}>
        <Text style={common.heading}>Código de barras</Text>
        <Text style={[common.muted, { marginTop: 4, marginBottom: 14 }]}>Opcional. Você também pode adicionar depois.</Text>
        <TextInput accessibilityLabel="Código de barras" placeholder="Digite o código" value={codigo}
          onChangeText={setCodigo} onFocus={onInputFocus} autoCapitalize="none" autoCorrect={false} maxLength={50} style={common.input} />
      </View>

      {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12, fontSize: 14 }}>{erro}</Text> : null}
      <ActionButton label="Salvar produto" onPress={() => void salvarProduto()} loading={salvando} disabled={categorias.isLoading || categorias.isError} icon="checkmark-outline" />
    </ScrollView>
  </KeyboardAvoidingView>;
}
