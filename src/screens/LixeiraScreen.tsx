import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listarCategoriasExcluidas, listarProdutosExcluidos, restaurarCategoria, restaurarProduto } from '../api/produtos';
import { listarLotesExcluidos, restaurarLote } from '../api/lotes';
import { mensagemErro } from '../api/errors';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import RefreshNotice from '../components/RefreshNotice';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, spacing } from '../components/theme';

export default function LixeiraScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const categorias = useQuery({ queryKey: ['lixeira', 'categorias'], queryFn: listarCategoriasExcluidas });
  const produtos = useQuery({ queryKey: ['lixeira', 'produtos'], queryFn: listarProdutosExcluidos });
  const lotes = useQuery({ queryKey: ['lixeira', 'lotes'], queryFn: listarLotesExcluidos });
  const [erro, setErro] = useState('');
  const [restaurando, setRestaurando] = useState<string | null>(null);
  const atualizar = useCallback(() => { void queryClient.invalidateQueries({ queryKey: ['lixeira'] }); }, [queryClient]);
  useFocusEffect(useCallback(() => { atualizar(); }, [atualizar]));

  const consultas = [categorias, produtos, lotes];
  const carregando = consultas.some(query => query.isPending && !query.data);
  const falhaInicial = consultas.some(query => query.isError && !query.data);
  const falhaAtualizacao = consultas.some(query => query.isError);
  const total = (categorias.data?.length ?? 0) + (produtos.data?.length ?? 0) + (lotes.data?.length ?? 0);

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
      void queryClient.invalidateQueries({ queryKey: ['descontos'] });
      void queryClient.invalidateQueries({ queryKey: ['relatorio'] });
      void queryClient.invalidateQueries({ queryKey: ['produto-codigo'] });
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível restaurar o registro.')); }
    finally { setRestaurando(null); }
  };

  return <ScrollView style={common.page} contentContainerStyle={common.content}
    refreshControl={<RefreshControl refreshing={consultas.some(query => query.isRefetching)} onRefresh={atualizar} tintColor={colors.green} />}>
    <ScreenHeading title="Lixeira" subtitle={total ? `${total} ${total === 1 ? 'registro excluído' : 'registros excluídos'} para restaurar` : 'Produtos, lotes e categorias excluídos aparecem aqui.'} />
    {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: spacing.md }}>{erro}</Text> : null}
    {carregando ? <LoadingState label="Carregando lixeira…" /> : falhaInicial ?
      <ErrorState message="Não foi possível carregar a lixeira." onRetry={atualizar} /> : null}
    {!carregando && !falhaInicial && falhaAtualizacao ? <RefreshNotice onRetry={atualizar} /> : null}
    {!carregando && !falhaInicial && total === 0 ?
      <EmptyState icon="trash-outline" title="Lixeira vazia" description="Nenhum registro foi excluído. Ao excluir um produto, lote ou categoria, ele aparecerá aqui para restauração."
        actionLabel="Atualizar" onAction={atualizar} /> : null}
    {!carregando && !falhaInicial && total > 0 ? <>
    <Text style={[common.heading, { marginBottom: spacing.sm }]}>Categorias ({categorias.data?.length ?? 0})</Text>
    {(categorias.data ?? []).map(item => <View key={item.id} style={common.card}>
      <Text style={common.body}>{item.nome}</Text>
      <ActionButton label="Restaurar categoria" variant="secondary" loading={restaurando === `c-${item.id}`}
        disabled={restaurando !== null && restaurando !== `c-${item.id}`}
        onPress={() => void restaurar(`c-${item.id}`, () => restaurarCategoria(item.id))} />
    </View>)}
    {!categorias.data?.length ? <Text style={[common.muted, { marginBottom: spacing.md }]}>Nenhuma categoria excluída.</Text> : null}
    <Text style={[common.heading, { marginBottom: spacing.sm }]}>Produtos ({produtos.data?.length ?? 0})</Text>
    {(produtos.data ?? []).map(item => <View key={item.id} style={common.card}>
      <Text style={common.body}>{item.nome}</Text>
      <ActionButton label="Restaurar produto" variant="secondary" loading={restaurando === `p-${item.id}`}
        disabled={restaurando !== null && restaurando !== `p-${item.id}`}
        onPress={() => void restaurar(`p-${item.id}`, () => restaurarProduto(item.id))} />
    </View>)}
    {!produtos.data?.length ? <Text style={[common.muted, { marginBottom: spacing.md }]}>Nenhum produto excluído.</Text> : null}
    <Text style={[common.heading, { marginBottom: spacing.sm }]}>Lotes ({lotes.data?.length ?? 0})</Text>
    {(lotes.data ?? []).map(item => <View key={item.id} style={common.card}>
      <Text style={common.body}>{item.nome_lote} · {item.produto_nome}</Text>
      <ActionButton label="Restaurar lote" variant="secondary" loading={restaurando === `l-${item.id}`}
        disabled={restaurando !== null && restaurando !== `l-${item.id}`}
        onPress={() => void restaurar(`l-${item.id}`, () => restaurarLote(item.id))} />
    </View>)}
    {!lotes.data?.length ? <Text style={common.muted}>Nenhum lote excluído.</Text> : null}
    </> : null}
  </ScrollView>;
}
