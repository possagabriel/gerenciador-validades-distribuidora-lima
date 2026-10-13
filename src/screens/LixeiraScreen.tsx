import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listarCategoriasExcluidas, listarProdutosExcluidos, restaurarCategoria, restaurarProduto } from '../api/produtos';
import { listarLotesExcluidos, restaurarLote } from '../api/lotes';
import { mensagemErro } from '../api/errors';
import ActionButton from '../components/ActionButton';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, spacing } from '../components/theme';

export default function LixeiraScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const categorias = useQuery({ queryKey: ['lixeira', 'categorias'], queryFn: listarCategoriasExcluidas });
  const produtos = useQuery({ queryKey: ['lixeira', 'produtos'], queryFn: listarProdutosExcluidos });
  const lotes = useQuery({ queryKey: ['lixeira', 'lotes'], queryFn: listarLotesExcluidos });
  const [erro, setErro] = useState('');
  const [restaurando, setRestaurando] = useState<string | null>(null);

  const restaurar = async (chave: string, operacao: () => Promise<unknown>) => {
    setRestaurando(chave); setErro('');
    try {
      await operacao();
      await queryClient.invalidateQueries({ queryKey: ['lixeira'] });
      void queryClient.invalidateQueries({ queryKey: ['categorias'] });
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      void queryClient.invalidateQueries({ queryKey: ['prioridade'] });
      void queryClient.invalidateQueries({ queryKey: ['alertas'] });
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível restaurar o registro.')); }
    finally { setRestaurando(null); }
  };

  return <ScrollView style={common.page} contentContainerStyle={common.content}>
    <ScreenHeading title="Lixeira" subtitle="Restaure registros excluídos sem perder o histórico." />
    {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: spacing.md }}>{erro}</Text> : null}
    {[categorias, produtos, lotes].some(query => query.isError) ? <Text style={{ color: colors.danger }}>Não foi possível carregar parte da lixeira.</Text> : null}
    <Text style={[common.heading, { marginBottom: spacing.sm }]}>Categorias</Text>
    {(categorias.data ?? []).map(item => <View key={item.id} style={common.card}>
      <Text style={common.body}>{item.nome}</Text>
      <ActionButton label="Restaurar categoria" variant="secondary" loading={restaurando === `c-${item.id}`}
        onPress={() => void restaurar(`c-${item.id}`, () => restaurarCategoria(item.id))} />
    </View>)}
    <Text style={[common.heading, { marginBottom: spacing.sm }]}>Produtos</Text>
    {(produtos.data ?? []).map(item => <View key={item.id} style={common.card}>
      <Text style={common.body}>{item.nome}</Text>
      <ActionButton label="Restaurar produto" variant="secondary" loading={restaurando === `p-${item.id}`}
        onPress={() => void restaurar(`p-${item.id}`, () => restaurarProduto(item.id))} />
    </View>)}
    <Text style={[common.heading, { marginBottom: spacing.sm }]}>Lotes</Text>
    {(lotes.data ?? []).map(item => <View key={item.id} style={common.card}>
      <Text style={common.body}>{item.nome_lote} · {item.produto_nome}</Text>
      <ActionButton label="Restaurar lote" variant="secondary" loading={restaurando === `l-${item.id}`}
        onPress={() => void restaurar(`l-${item.id}`, () => restaurarLote(item.id))} />
    </View>)}
  </ScrollView>;
}
