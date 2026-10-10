import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { atualizarProduto, listarCategorias } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import { useProduto } from '../hooks/useProdutos';
import { useKeyboardScroll } from '../hooks/useKeyboardScroll';
import type { ProductsStackParams } from '../navigation/types';
import type { Produto } from '../types/produto';
import { lerPreco } from '../utils/formatters';
import ActionButton from '../components/ActionButton';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, radius, spacing } from '../components/theme';

function Formulario({ produto }: { produto: Produto }): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const queryClient = useQueryClient();
  const { scrollRef, onInputFocus } = useKeyboardScroll();
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: listarCategorias });
  const [nome, setNome] = useState(produto.nome);
  const [categoriaId, setCategoriaId] = useState(produto.categoria);
  const [preco, setPreco] = useState(String(produto.preco_venda).replace('.', ','));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    const valorNome = nome.trim();
    const valorPreco = lerPreco(preco);
    if (!valorNome) { setErro('Informe o nome do produto.'); return; }
    if (!categoriaId || !categorias.data?.some(item => item.id === categoriaId)) { setErro('Selecione uma categoria.'); return; }
    if (valorPreco === null) { setErro('Informe um preço válido, como 19,90.'); return; }
    setSalvando(true); setErro('');
    try {
      const atualizado = await atualizarProduto(produto.id, { nome: valorNome, categoria: categoriaId, preco_venda: valorPreco });
      queryClient.setQueryData(['produto', produto.id], atualizado);
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      void queryClient.invalidateQueries({ queryKey: ['prioridade'] });
      void queryClient.invalidateQueries({ queryKey: ['alertas'] });
      void queryClient.invalidateQueries({ queryKey: ['relatorio'] });
      void queryClient.invalidateQueries({ queryKey: ['descontos'] });
      navigation.goBack();
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível atualizar o produto.')); }
    finally { setSalvando(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} style={common.page} contentContainerStyle={common.content}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <ScreenHeading title="Editar produto" subtitle="Altere os dados do catálogo." />
      <View style={common.card}>
        <Text style={[common.muted, { marginBottom: 6 }]}>Nome do produto *</Text>
        <TextInput accessibilityLabel="Nome do produto" value={nome} onChangeText={setNome}
          onFocus={onInputFocus} maxLength={255} autoCapitalize="sentences" style={[common.input, { marginBottom: 18 }]} />

        <Text style={[common.muted, { marginBottom: 8 }]}>Categoria *</Text>
        {categorias.isError ? <ErrorState message="Não foi possível carregar as categorias." onRetry={() => void categorias.refetch()} /> :
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {(categorias.data ?? []).map(item => <Pressable key={item.id} accessibilityRole="button"
              accessibilityState={{ selected: categoriaId === item.id }} onPress={() => setCategoriaId(item.id)}
              style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, opacity: pressed ? 0.7 : 1,
                borderColor: categoriaId === item.id ? colors.green : colors.border,
                backgroundColor: categoriaId === item.id ? colors.greenSoft : colors.white })}>
              <Text style={{ color: categoriaId === item.id ? colors.greenDark : colors.muted, fontWeight: '600' }}>{item.nome}</Text>
            </Pressable>)}
            {categorias.isLoading ? <Text style={common.muted}>Carregando categorias…</Text> : null}
          </View>}

        <Text style={[common.muted, { marginBottom: 6 }]}>Preço de venda *</Text>
        <TextInput accessibilityLabel="Preço de venda" value={preco} onChangeText={setPreco}
          onFocus={onInputFocus} keyboardType="decimal-pad" maxLength={20} style={common.input} />
      </View>
      <Text style={[common.muted, { marginBottom: spacing.lg }]}>Lotes e códigos de barras são gerenciados nas telas próprias.</Text>
      {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: 12 }}>{erro}</Text> : null}
      <ActionButton label="Salvar alterações" icon="checkmark-outline" onPress={() => void salvar()}
        loading={salvando} disabled={categorias.isLoading || categorias.isError} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

export default function EditarProdutoScreen(): React.JSX.Element {
  const { params } = useRoute<RouteProp<ProductsStackParams, 'EditarProduto'>>();
  const query = useProduto(params.id);
  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  return <Formulario produto={query.data} />;
}
