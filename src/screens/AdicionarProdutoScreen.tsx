import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { criarCategoria, criarProduto, listarCategorias } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import { useKeyboardScroll } from '../hooks/useKeyboardScroll';
import { podeGerenciar, usePerfil } from '../hooks/usePerfil';
import type { Categoria } from '../types/categoria';
import type { ProductsStackParams } from '../navigation/types';
import { lerPreco } from '../utils/formatters';
import { dateToISO } from '../utils/calendar';
import ActionButton from '../components/ActionButton';
import DatePickerField from '../components/DatePickerField';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, radius, spacing } from '../components/theme';

export default function AdicionarProdutoScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const queryClient = useQueryClient();
  const { scrollRef, onInputFocus } = useKeyboardScroll();
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: listarCategorias });
  const perfil = usePerfil();
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
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const nomeRef = useRef<TextInput>(null);
  const precoRef = useRef<TextInput>(null);
  const quantidadeRef = useRef<TextInput>(null);
  const custoRef = useRef<TextInput>(null);
  const codigoRef = useRef<TextInput>(null);
  const loteCardY = useRef(0);

  const falhaCampo = (campo: string, mensagem: string, input?: React.RefObject<TextInput | null>) => {
    setErrosCampos({ [campo]: mensagem });
    if (input?.current) input.current.focus();
    else scrollRef.current?.scrollTo({ y: campo === 'validade' || campo === 'quantidade' || campo === 'custo' ? loteCardY.current : 0, animated: true });
  };
  const limparCampo = (campo: string) => setErrosCampos(atual => ({ ...atual, [campo]: '' }));

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
    const valorValidade = validade && validade >= dateToISO(new Date()) ? `${validade}T12:00:00.000Z` : null;
    const valorQuantidade = Number(quantidade);
    const valorCusto = lerPreco(custo);
    if (!valorNome) { falhaCampo('nome', 'Informe o nome do produto.', nomeRef); return; }
    if (!categoriaId) { falhaCampo('categoria', 'Selecione ou crie uma categoria.'); return; }
    if (valorPreco === null) { falhaCampo('preco', 'Informe um preço válido, como 19,90.', precoRef); return; }
    if (!valorValidade) { setErroValidade('Selecione uma validade de hoje em diante.'); falhaCampo('validade', 'Selecione uma validade de hoje em diante.'); return; }
    if (!Number.isInteger(valorQuantidade) || valorQuantidade <= 0) { falhaCampo('quantidade', 'Informe uma quantidade maior que zero.', quantidadeRef); return; }
    if (valorCusto === null) { falhaCampo('custo', 'Informe um custo por unidade válido, como 12,50.', custoRef); return; }
    if (valorCodigo.length > 50) { falhaCampo('codigo', 'O código de barras deve ter até 50 caracteres.', codigoRef); return; }
    setSalvando(true); setErro(''); setErrosCampos({});
    try {
      const produto = await criarProduto({
        nome: valorNome,
        categoria: categoriaId,
        preco_venda: valorPreco,
        lote_inicial: {
          quantidade: valorQuantidade,
          custo_unitario_compra: valorCusto,
          data_validade: valorValidade
        },
        codigo_barras: valorCodigo || undefined,
      });
      queryClient.setQueryData(['produto', produto.id], produto);
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      void queryClient.invalidateQueries({ queryKey: ['prioridade'] });
      void queryClient.invalidateQueries({ queryKey: ['alertas'] });
      navigation.replace('ProdutoDetalhe', { id: produto.id });
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
        <TextInput ref={nomeRef} accessibilityLabel="Nome do produto" placeholder="Ex.: Leite integral 1L" value={nome} onChangeText={value => { setNome(value); limparCampo('nome'); }}
          onFocus={onInputFocus} maxLength={255} autoCapitalize="sentences" style={[common.input, { marginBottom: 18 }]} />
        {errosCampos.nome ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{errosCampos.nome}</Text> : null}

        <View style={[common.row, { marginBottom: 8 }]}>
          <Text style={common.muted}>Categoria *</Text>
          {podeGerenciar(perfil.data?.tipo_funcionario) ? <Pressable accessibilityRole="button" onPress={() => setCriandoCategoria(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.greenDark, fontWeight: '700' }}>{criandoCategoria ? 'Cancelar' : 'Nova categoria'}</Text>
          </Pressable> : null}
        </View>
        {categorias.isError ? <ErrorState message="Não foi possível carregar as categorias." onRetry={() => void categorias.refetch()} /> :
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {(categorias.data ?? []).map(item => <Pressable key={item.id} accessibilityRole="button"
              accessibilityState={{ selected: categoriaId === item.id }} onPress={() => { setCategoriaId(item.id); limparCampo('categoria'); }}
              style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, opacity: pressed ? 0.7 : 1,
                borderColor: categoriaId === item.id ? colors.green : colors.border,
                backgroundColor: categoriaId === item.id ? colors.greenSoft : colors.white })}>
              <Text style={{ color: categoriaId === item.id ? colors.greenDark : colors.muted, fontWeight: '600' }}>{item.nome}</Text>
            </Pressable>)}
            {categorias.isLoading ? <Text style={common.muted}>Carregando categorias…</Text> : null}
            {!categorias.isLoading && !categorias.data?.length ? <Text style={common.muted}>Ainda não há categorias. Crie a primeira acima.</Text> : null}
          </View>}
        {errosCampos.categoria ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 8 }}>{errosCampos.categoria}</Text> : null}
        {criandoCategoria ? <View style={{ backgroundColor: colors.background, padding: spacing.md, borderRadius: radius.card, marginBottom: spacing.lg }}>
          <TextInput accessibilityLabel="Nome da nova categoria" placeholder="Ex.: Mercearia" value={novaCategoria}
            onChangeText={setNovaCategoria} onFocus={onInputFocus} maxLength={100} style={[common.input, { marginBottom: 10 }]} />
          <ActionButton label="Salvar categoria" onPress={() => void salvarCategoria()} loading={salvandoCategoria} variant="secondary" />
          <Text style={[common.muted, { marginTop: 8 }]}>Prazos iniciais: atenção em 30 dias e crítico em 7 dias.</Text>
        </View> : null}

        <Text style={[common.muted, { marginBottom: 6 }]}>Preço de venda *</Text>
        <TextInput ref={precoRef} accessibilityLabel="Preço de venda" placeholder="0,00" value={preco} onChangeText={value => { setPreco(value); limparCampo('preco'); }}
          onFocus={onInputFocus} keyboardType="decimal-pad" maxLength={20} style={[common.input, { marginBottom: 6 }]} />
        {errosCampos.preco ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{errosCampos.preco}</Text> : null}
        <Text style={common.muted}>Valor por unidade, em reais.</Text>
      </View>

      <View style={common.card} onLayout={event => { loteCardY.current = event.nativeEvent.layout.y; }}>
        <Text style={common.heading}>Lote inicial</Text>
        <Text style={[common.muted, { marginTop: 4, marginBottom: 14 }]}>A validade define se o lote está em dia, em atenção, crítico ou vencido.</Text>

        <Text style={[common.muted, { marginBottom: 6 }]}>Data de validade * · hoje ou futura</Text>
        <DatePickerField label="Data de validade" value={validade} minDate={dateToISO(new Date())}
          onChangeText={value => { setValidade(value); setErroValidade(''); limparCampo('validade'); }} />
        {erroValidade ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 18 }}>{erroValidade}</Text> : null}

        <Text style={[common.muted, { marginBottom: 6 }]}>Quantidade *</Text>
        <TextInput ref={quantidadeRef} accessibilityLabel="Quantidade do lote" placeholder="Ex.: 24" value={quantidade}
          onChangeText={value => { setQuantidade(value.replace(/\D/g, '')); limparCampo('quantidade'); }} onFocus={onInputFocus} keyboardType="number-pad" maxLength={9}
          style={[common.input, { marginBottom: 18 }]} />
        {errosCampos.quantidade ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{errosCampos.quantidade}</Text> : null}

        <Text style={[common.muted, { marginBottom: 6 }]}>Custo por unidade *</Text>
        <TextInput ref={custoRef} accessibilityLabel="Custo por unidade" placeholder="0,00" value={custo} onChangeText={value => { setCusto(value); limparCampo('custo'); }}
          onFocus={onInputFocus} keyboardType="decimal-pad" maxLength={20} style={[common.input, { marginBottom: 6 }]} />
        {errosCampos.custo ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{errosCampos.custo}</Text> : null}
        <Text style={common.muted}>O lote será criado automaticamente ao salvar o produto.</Text>
      </View>

      <View style={common.card}>
        <Text style={common.heading}>Código de barras</Text>
        <Text style={[common.muted, { marginTop: 4, marginBottom: 14 }]}>Opcional. Você também pode adicionar depois.</Text>
        <TextInput ref={codigoRef} accessibilityLabel="Código de barras" placeholder="Digite o código" value={codigo}
          onChangeText={value => { setCodigo(value); limparCampo('codigo'); }} onFocus={onInputFocus} autoCapitalize="none" autoCorrect={false} maxLength={50} style={common.input} />
        {errosCampos.codigo ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{errosCampos.codigo}</Text> : null}
      </View>

      {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12, fontSize: 14 }}>{erro}</Text> : null}
      <ActionButton label="Salvar produto" onPress={() => void salvarProduto()} loading={salvando} disabled={categorias.isLoading || categorias.isError} icon="checkmark-outline" />
    </ScrollView>
  </KeyboardAvoidingView>;
}
