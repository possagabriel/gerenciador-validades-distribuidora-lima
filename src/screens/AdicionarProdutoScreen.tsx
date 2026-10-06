import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { criarCategoria, criarCodigoBarras, criarProduto, detalharProduto, listarCategorias } from '../api/produtos';
import type { LoteInicial } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import type { Categoria } from '../types/categoria';
import type { Produto } from '../types/produto';
import type { ProductsStackParams } from '../navigation/types';
import { formatarData, lerPreco } from '../utils/formatters';
import ActionButton from '../components/ActionButton';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import BarcodeField from '../components/BarcodeField';
import DatePickerField from '../components/DatePickerField';
import { dateFromISO } from '../utils/calendar';
import { colors, common, radius, spacing } from '../components/theme';

type GrupoLote = { dataValidade: string; quantidade: string; custo: string };
const novoGrupoLote = (): GrupoLote => ({ dataValidade: '', quantidade: '', custo: '' });

export default function AdicionarProdutoScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const queryClient = useQueryClient();
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: listarCategorias });
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [preco, setPreco] = useState('');
  const [codigo, setCodigo] = useState('');
  const [gruposLote, setGruposLote] = useState<GrupoLote[]>([novoGrupoLote()]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const salvandoRef = useRef(false);
  const [erro, setErro] = useState('');
  const [produtoCriado, setProdutoCriado] = useState<Produto | null>(null);
  const minValidade = new Date().toISOString().slice(0, 10);

  const abrirProduto = (produto: Produto) => {
    queryClient.setQueryData(['produto', produto.id], produto);
    void queryClient.invalidateQueries({ queryKey: ['produtos'] });
    void queryClient.invalidateQueries({ queryKey: ['lotes'] });
    navigation.replace('ProdutoDetalhe', { id: produto.id });
  };

  const salvarCodigo = async (produto: Produto, valorCodigo: string) => {
    try {
      const sku = await criarCodigoBarras(produto.id, valorCodigo);
      abrirProduto({ ...produto, skus: [...produto.skus.filter(item => item.id !== sku.id), sku] });
    } catch (error) {
      setProdutoCriado(produto);
      setErro(`O produto foi criado, mas o código ainda não foi confirmado: ${mensagemErro(error, 'Tente salvar o código novamente.')}`);
    }
  };

  const tentarSalvarCodigo = async () => {
    if (!produtoCriado || salvandoRef.current) return;
    const valorCodigo = codigo.trim();
    if (!valorCodigo) { setErro('Informe o código de barras ou abra o produto para adicionar depois.'); return; }
    salvandoRef.current = true;
    setSalvando(true); setErro('');
    try {
      const atualizado = await detalharProduto(produtoCriado.id);
      if (atualizado.skus.some(sku => sku.codigo_barras === valorCodigo)) {
        abrirProduto(atualizado);
        return;
      }
      await salvarCodigo(atualizado, valorCodigo);
    } catch (error) {
      setErro(mensagemErro(error, 'Não foi possível verificar o código. Tente novamente.'));
    } finally { salvandoRef.current = false; setSalvando(false); }
  };

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
    if (!valorNome) { setErro('Informe o nome do produto.'); return; }
    if (!categoriaId) { setErro('Selecione ou crie uma categoria.'); return; }
    if (valorPreco === null) { setErro('Informe um preço válido, como 19,90.'); return; }
    if (valorCodigo.length > 50) { setErro('O código de barras deve ter até 50 caracteres.'); return; }
    const lotesIniciais: LoteInicial[] = [];
    for (const [index, grupo] of gruposLote.entries()) {
      const quantidade = Number(grupo.quantidade);
      const custo = lerPreco(grupo.custo);
      if (!dateFromISO(grupo.dataValidade) || grupo.dataValidade < minValidade) {
        setErro(`Selecione uma validade a partir de ${formatarData(minValidade)} no lote ${index + 1}.`); return;
      }
      if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
        setErro(`Informe a quantidade de unidades do lote ${index + 1}.`); return;
      }
      if (custo === null || custo < 0) {
        setErro(`Informe o custo de compra por unidade do lote ${index + 1}.`); return;
      }
      lotesIniciais.push({ data_validade: grupo.dataValidade, quantidade, custo_unitario_compra: custo });
    }
    if (new Set(lotesIniciais.map(lote => lote.data_validade)).size !== lotesIniciais.length) {
      setErro('Use uma linha por data de validade.'); return;
    }
    if (salvandoRef.current) return;
    salvandoRef.current = true;
    setSalvando(true); setErro('');
    try {
      const produto = await criarProduto({ nome: valorNome, categoria: categoriaId, preco_venda: valorPreco,
        lotes_iniciais: lotesIniciais });
      queryClient.setQueryData(['produto', produto.id], produto);
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      if (valorCodigo) await salvarCodigo(produto, valorCodigo);
      else abrirProduto(produto);
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível criar o produto.')); }
    finally { salvandoRef.current = false; setSalvando(false); }
  };

  if (produtoCriado) return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={common.page} contentContainerStyle={common.content} keyboardShouldPersistTaps="handled">
      <ScreenHeading title="Produto criado" subtitle="Confirme o código de barras para concluir o cadastro." />
      <View style={common.card}>
        <Text style={[common.heading, { marginBottom: 12 }]}>{produtoCriado.nome}</Text>
        <BarcodeField label="Código de barras" value={codigo} onChangeText={setCodigo} />
      </View>
      {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12 }}>{erro}</Text> : null}
      <ActionButton label="Tentar salvar código" onPress={() => void tentarSalvarCodigo()} loading={salvando} />
      <ActionButton label="Abrir produto e adicionar depois" variant="secondary" disabled={salvando}
        onPress={() => abrirProduto(produtoCriado)} style={{ marginTop: 10 }} />
    </ScrollView>
  </KeyboardAvoidingView>;

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={common.page} contentContainerStyle={common.content} keyboardShouldPersistTaps="handled">
      <ScreenHeading title="Novo produto" subtitle="Preencha os dados do produto." />

      <View style={common.card}>
        <Text style={[common.heading, { marginBottom: 16 }]}>Informações do produto</Text>
        <Text style={[common.muted, { marginBottom: 6 }]}>Nome do produto *</Text>
        <TextInput accessibilityLabel="Nome do produto" placeholder="Ex.: Leite integral 1L" value={nome} onChangeText={setNome}
          maxLength={255} autoCapitalize="sentences" style={[common.input, { marginBottom: 18 }]} />

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
            onChangeText={setNovaCategoria} maxLength={100} style={[common.input, { marginBottom: 10 }]} />
          <ActionButton label="Salvar categoria" onPress={() => void salvarCategoria()} loading={salvandoCategoria} variant="secondary" />
          <Text style={[common.muted, { marginTop: 8 }]}>Prazos iniciais: atenção em 30 dias e crítico em 7 dias.</Text>
        </View> : null}

        <Text style={[common.muted, { marginBottom: 6 }]}>Preço de venda *</Text>
        <TextInput accessibilityLabel="Preço de venda" placeholder="0,00" value={preco} onChangeText={setPreco}
          keyboardType="decimal-pad" style={[common.input, { marginBottom: 6 }]} />
        <Text style={common.muted}>Valor por unidade, em reais.</Text>
      </View>

      <View style={common.card}>
        <View style={[common.row, { marginBottom: 6 }]}>
          <Text style={common.heading}>Estoque e validade</Text>
          <Pressable accessibilityRole="button" onPress={() => setGruposLote(current => [...current, novoGrupoLote()])}
            style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.greenDark, fontWeight: '700' }}>Adicionar validade</Text>
          </Pressable>
        </View>
        <Text style={[common.muted, { marginBottom: 14 }]}>Cada data cria um lote separado para controlar o estoque.</Text>
        {gruposLote.map((grupo, index) => <View key={index} style={{ borderTopWidth: index ? 1 : 0, borderColor: colors.border, paddingTop: index ? 14 : 0, marginTop: index ? 6 : 0, marginBottom: 14 }}>
          <View style={[common.row, { marginBottom: 8 }]}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>Lote {index + 1}</Text>
            {gruposLote.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Remover lote ${index + 1}`}
              onPress={() => setGruposLote(current => current.filter((_, itemIndex) => itemIndex !== index))}
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: colors.danger, fontWeight: '700' }}>Remover</Text>
            </Pressable> : null}
          </View>
          <Text style={[common.muted, { marginBottom: 6 }]}>Data de validade *</Text>
          <DatePickerField label={`Data de validade do lote ${index + 1}`} value={grupo.dataValidade} minDate={minValidade}
            onChangeText={value => setGruposLote(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, dataValidade: value } : item))} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[common.muted, { marginBottom: 6 }]}>Unidades *</Text>
              <TextInput accessibilityLabel={`Quantidade do lote ${index + 1}`} placeholder="0" value={grupo.quantidade}
                onChangeText={value => setGruposLote(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantidade: value.replace(/[^0-9]/g, '') } : item))}
                keyboardType="number-pad" style={common.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[common.muted, { marginBottom: 6 }]}>Custo por unidade *</Text>
              <TextInput accessibilityLabel={`Custo de compra do lote ${index + 1}`} placeholder="0,00" value={grupo.custo}
                onChangeText={value => setGruposLote(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, custo: value } : item))}
                keyboardType="decimal-pad" style={common.input} />
            </View>
          </View>
        </View>)}
      </View>

      <View style={common.card}>
        <Text style={common.heading}>Código de barras</Text>
        <Text style={[common.muted, { marginTop: 4, marginBottom: 14 }]}>Opcional. Você também pode adicionar depois.</Text>
        <BarcodeField label="Código de barras" value={codigo} onChangeText={setCodigo} />
      </View>

      {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12, fontSize: 14 }}>{erro}</Text> : null}
      <ActionButton label="Salvar produto" onPress={() => void salvarProduto()} loading={salvando} disabled={categorias.isLoading || categorias.isError} icon="checkmark-outline" />
    </ScrollView>
  </KeyboardAvoidingView>;
}
