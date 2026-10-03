import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { criarCategoria, criarCodigoBarras, criarProduto, listarCategorias } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import type { ProductsStackParams } from '../navigation/types';
import { lerPreco } from '../utils/formatters';
import ActionButton from '../components/ActionButton';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, radius, spacing } from '../components/theme';

export default function AdicionarProdutoScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const queryClient = useQueryClient();
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: listarCategorias });
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [preco, setPreco] = useState('');
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
      await queryClient.invalidateQueries({ queryKey: ['categorias'] });
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
    setSalvando(true); setErro('');
    try {
      const produto = await criarProduto({ nome: valorNome, categoria: categoriaId, preco_venda: valorPreco });
      await queryClient.invalidateQueries({ queryKey: ['produtos'] });
      let aviso: string | null = null;
      if (valorCodigo) {
        try { await criarCodigoBarras(produto.id, valorCodigo); }
        catch (error) { aviso = mensagemErro(error, 'Não foi possível salvar o código de barras.'); }
      }
      await queryClient.invalidateQueries({ queryKey: ['produto', produto.id] });
      navigation.replace('ProdutoDetalhe', { id: produto.id });
      if (aviso) Alert.alert('Produto criado', `O produto foi salvo, mas o código de barras não: ${aviso}`);
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível criar o produto.')); }
    finally { setSalvando(false); }
  };

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
        <Text style={common.heading}>Código de barras</Text>
        <Text style={[common.muted, { marginTop: 4, marginBottom: 14 }]}>Opcional. Você também pode adicionar depois.</Text>
        <TextInput accessibilityLabel="Código de barras" placeholder="Digite o número do código" value={codigo}
          onChangeText={setCodigo} keyboardType="number-pad" maxLength={50} style={common.input} />
      </View>

      {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12, fontSize: 14 }}>{erro}</Text> : null}
      <ActionButton label="Salvar produto" onPress={() => void salvarProduto()} loading={salvando} disabled={categorias.isLoading || categorias.isError} icon="checkmark-outline" />
    </ScrollView>
  </KeyboardAvoidingView>;
}
