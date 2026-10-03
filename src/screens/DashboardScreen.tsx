import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { obterRelatorio } from '../api/relatorios';
import { useLotes } from '../hooks/useLotes';
import type { TabsParams } from '../navigation/types';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';
import LoteCard from '../components/LoteCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, radius, spacing, type } from '../components/theme';
import { formatarMoeda } from '../utils/formatters';

export default function DashboardScreen(): React.JSX.Element {
  const navigation = useNavigation<BottomTabNavigationProp<TabsParams>>();
  const criticos = useLotes(2);
  const relatorio = useQuery({ queryKey: ['relatorio'], queryFn: obterRelatorio });
  const refresh = () => { void criticos.refetch(); void relatorio.refetch(); };
  if (criticos.isLoading || relatorio.isLoading) return <LoadingState />;
  if (criticos.isError || relatorio.isError) return <ErrorState onRetry={refresh} />;
  const lotes = (criticos.data ?? []).filter(item => !item.esgotado);
  return <ScrollView style={common.page} contentContainerStyle={common.content}
    refreshControl={<RefreshControl refreshing={criticos.isRefetching || relatorio.isRefetching} onRefresh={refresh} tintColor={colors.green} />}>
    <ScreenHeading title="Visão geral" subtitle="Validades que pedem atenção hoje." />
    <View style={{ backgroundColor: colors.greenDark, borderRadius: radius.feature, padding: spacing.xl, marginBottom: spacing.base }}>
      <Text style={{ color: colors.paleInk, fontSize: type.small, fontWeight: '700' }}>Lotes críticos em estoque</Text>
      <Text style={{ color: colors.white, fontSize: type.metric, fontWeight: '800', marginTop: spacing.xs }}>{lotes.length}</Text>
      <Text style={{ color: colors.paleInk, fontSize: type.small }}>Precisam ser conferidos</Text>
    </View>
    <ActionButton label="Adicionar produto" icon="add-circle-outline" onPress={() => navigation.navigate('Produtos', { screen: 'AdicionarProduto' })} style={{ marginBottom: spacing.xl }} />
    <View style={[common.row, { marginBottom: spacing.md }]}>
      <Text style={common.heading}>Prioridade do dia</Text>
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Lotes', { screen: 'LotesLista' })} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={[common.muted, { color: colors.greenDark, fontWeight: '700' }]}>Ver lotes</Text>
      </Pressable>
    </View>
    {lotes.length ? lotes.slice(0, 3).map(lote =>
      <LoteCard key={lote.id} lote={lote} onPress={() => navigation.navigate('Lotes', { screen: 'LoteDetalhe', params: { id: lote.id } })} />) :
      <EmptyState icon="checkmark-circle-outline" title="Nenhum lote crítico" description="Os lotes em estoque estão fora da faixa crítica." />}
    <View style={[common.card, { marginTop: spacing.md }]}>
      <Text style={common.muted}>Prejuízo nos últimos 30 dias</Text>
      <Text style={[common.heading, { fontSize: 24, marginTop: spacing.xs }]}>{formatarMoeda(relatorio.data?.prejuizo_total ?? null)}</Text>
    </View>
  </ScrollView>;
}
