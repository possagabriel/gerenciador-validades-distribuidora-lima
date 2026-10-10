import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportarCsvLotes, obterRelatorioFiltrado, type FiltrosRelatorio } from '../api/relatorios';
import { listarCategorias, listarProdutos } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import ActionButton from '../components/ActionButton';
import DatePickerField from '../components/DatePickerField';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import RefreshNotice from '../components/RefreshNotice';
import { colors, common, radius, spacing } from '../components/theme';
import { formatarData, formatarMoeda } from '../utils/formatters';

export default function RelatoriosScreen(): React.JSX.Element {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [categoria, setCategoria] = useState<number | undefined>();
  const [produto, setProduto] = useState<number | undefined>();
  const [buscaProduto, setBuscaProduto] = useState('');
  const [erro, setErro] = useState('');
  const [exportando, setExportando] = useState(false);
  const filtros: FiltrosRelatorio = {
    ...(inicio ? { data_inicio: inicio } : {}), ...(fim ? { data_fim: fim } : {}),
    ...(categoria ? { categoria } : {}), ...(produto ? { produto } : {}),
  };
  const chave = JSON.stringify(filtros);
  const query = useQuery({ queryKey: ['relatorio', chave], queryFn: () => obterRelatorioFiltrado(filtros) });
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: listarCategorias });
  const produtos = useQuery({ queryKey: ['produtos-opcoes', buscaProduto], queryFn: () => listarProdutos(buscaProduto) });
  useRefreshOnFocus('relatorio', chave);

  const compartilharCsv = async () => {
    setExportando(true); setErro('');
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Compartilhamento indisponível');
      const csv = await exportarCsvLotes(filtros);
      const arquivo = new File(Paths.cache, `lotes-${Date.now()}.csv`);
      arquivo.create();
      arquivo.write(csv);
      await Sharing.shareAsync(arquivo.uri, { mimeType: 'text/csv', dialogTitle: 'Exportar lotes em CSV' });
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível exportar o CSV neste aparelho.')); }
    finally { setExportando(false); }
  };
  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  return <FlatList style={common.page} contentContainerStyle={common.content}
    data={data.lotes_considerados} keyExtractor={lote => String(lote.id)}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.green} />}
    ListHeaderComponent={<>
      <ScreenHeading title="Prejuízo" subtitle={`${formatarData(data.periodo.data_inicio)} a ${formatarData(data.periodo.data_fim)}`} />
      <View style={common.card}>
        <Text style={[common.heading, { marginBottom: spacing.md }]}>Filtros</Text>
        <Text style={common.muted}>Início do período</Text>
        <DatePickerField label="Data inicial" value={inicio} onChangeText={value => { setInicio(value); if (fim && value > fim) setFim(''); }} minDate="2000-01-01" />
        <Text style={common.muted}>Fim do período</Text>
        <DatePickerField label="Data final" value={fim} onChangeText={setFim} minDate={inicio || '2000-01-01'} />
        <Text style={common.muted}>Categoria</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
          <Pressable accessibilityRole="button" onPress={() => setCategoria(undefined)} style={{ padding: 8 }}><Text style={{ color: colors.greenDark }}>Todas</Text></Pressable>
          {(categorias.data ?? []).map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => setCategoria(item.id)} style={{ padding: 8, backgroundColor: categoria === item.id ? colors.greenSoft : colors.white }}>
            <Text style={{ color: colors.greenDark }}>{item.nome}</Text>
          </Pressable>)}
        </View>
        <Text style={common.muted}>Produto</Text>
        <TextInput accessibilityLabel="Buscar produto no relatório" value={buscaProduto} onChangeText={setBuscaProduto} placeholder="Buscar produto" style={common.input} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
          <Pressable accessibilityRole="button" onPress={() => setProduto(undefined)} style={{ padding: 8 }}><Text style={{ color: colors.greenDark }}>Todos</Text></Pressable>
          {(produtos.data ?? []).map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => setProduto(item.id)} style={{ padding: 8, backgroundColor: produto === item.id ? colors.greenSoft : colors.white }}>
            <Text style={{ color: colors.greenDark }}>{item.nome}</Text>
          </Pressable>)}
        </View>
        <ActionButton label="Exportar lotes em CSV" variant="secondary" onPress={() => void compartilharCsv()} loading={exportando} />
        {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginTop: 8 }}>{erro}</Text> : null}
      </View>
      {query.isError ? <RefreshNotice onRetry={() => void query.refetch()} /> : null}
      <View style={[common.card, { borderRadius: radius.feature, padding: spacing.xl }]}>
        <Text style={common.muted}>Prejuízo total</Text>
        <Text style={{ color: colors.ink, fontSize: 30, fontWeight: '800', marginTop: 8 }}>{formatarMoeda(data.prejuizo_total)}</Text>
        <Text style={[common.muted, { marginTop: 7 }]}>No período exibido acima</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        <View style={[common.card, { flex: 1, marginBottom: 0 }]}>
          <Text style={common.eyebrow}>LOTES</Text>
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 5 }}>{data.quantidade_lotes_considerados}</Text>
          <Text style={common.muted}>considerados</Text>
        </View>
        <View style={[common.card, { flex: 1, marginBottom: 0 }]}>
          <Text style={common.eyebrow}>SEM CUSTO</Text>
          <Text style={{ color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 5 }}>{data.quantidade_lotes_sem_custo_cadastrado}</Text>
          <Text style={common.muted}>sem valor cadastrado</Text>
        </View>
      </View>
      <Text style={[common.heading, { marginBottom: 12 }]}>Lotes considerados</Text>
    </>}
    renderItem={({ item: lote }) => <View style={common.card}>
      <Text style={common.heading}>{lote.produto_nome}</Text>
      <Text style={[common.muted, { marginTop: 5 }]}>{lote.nome_lote}</Text>
      <View style={[common.row, { marginTop: 14 }]}>
        <Text style={common.body}>{lote.quantidade} unidades</Text>
        <Text style={[common.body, { fontWeight: '700' }]}>{formatarData(lote.data_validade)}</Text>
      </View>
    </View>}
    ListEmptyComponent={<EmptyState icon="document-text-outline" title="Sem lotes no período" description="O relatório ainda não tem lotes com custo e prejuízo calculável." />}
  />;
}
